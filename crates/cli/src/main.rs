//! `turbodrop` — the command-line edition. Same engine and protocol as the desktop app.

use std::io::{IsTerminal, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{anyhow, bail};
use clap::{Parser, Subcommand};
use turbodrop_core::{Config, Direction, Event, Node, Status, TransferView};

#[derive(Parser)]
#[command(
    name = "turbodrop",
    version,
    about = "AirDrop-style file sharing for every device on your network — phones need no app (scan the QR code).",
    after_help = "Examples:\n  turbodrop receive                  Show a QR code; phones and computers can send you files\n  turbodrop share photo.jpg docs/    Show a QR code and hand these files to the phone that scans it\n  turbodrop send report.pdf --to Laptop\n  turbodrop devices\n\nMade by Pouyam — https://www.pouyam.com"
)]
struct Cli {
    /// Print events as JSON lines (for scripts).
    #[arg(long, global = true)]
    json: bool,
    /// Name other devices see.
    #[arg(long, global = true)]
    name: Option<String>,
    /// HTTP port (default 47474, next free port if taken).
    #[arg(long, global = true)]
    port: Option<u16>,
    /// Folder for received files (default: Downloads/Turbodrop).
    #[arg(long, global = true)]
    dir: Option<PathBuf>,
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Wait for files: shows a QR code for phones, and accepts from nearby Turbodrop devices.
    Receive {
        /// Accept everything without asking (also from unknown devices).
        #[arg(short, long)]
        yes: bool,
        /// Exit after the first finished transfer.
        #[arg(long)]
        once: bool,
    },
    /// Show a QR code and send files to the phone that scans it (it also can send back).
    Share {
        #[arg(required = true)]
        paths: Vec<PathBuf>,
        /// Also send this text.
        #[arg(long)]
        text: Option<String>,
    },
    /// Send files to a nearby Turbodrop device (by name, id or IP address).
    Send {
        paths: Vec<PathBuf>,
        /// Device name (case-insensitive substring), id, or IP[:port].
        #[arg(long)]
        to: String,
        /// Send this text (alone or with files).
        #[arg(long)]
        text: Option<String>,
        /// Seconds to look for the device.
        #[arg(long, default_value_t = 6)]
        wait: u64,
    },
    /// List Turbodrop devices on this network.
    Devices {
        #[arg(long, default_value_t = 3)]
        wait: u64,
    },
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_env("TURBODROP_LOG").unwrap_or_else(|_| "warn".into()))
        .with_writer(std::io::stderr)
        .init();
    if let Err(e) = run(Cli::parse()).await {
        eprintln!("error: {e:#}");
        std::process::exit(1);
    }
}

async fn start(cli: &Cli) -> anyhow::Result<Arc<Node>> {
    let data = turbodrop_core::default_data_dir().join("cli");
    let downloads = cli.dir.clone().unwrap_or_else(turbodrop_core::default_download_dir);
    let mut cfg = Config::new(data, downloads);
    if let Some(n) = &cli.name {
        cfg.settings.device_name = n.clone();
    }
    if let Some(p) = cli.port {
        cfg.port = p;
    }
    if let Ok(dp) = std::env::var("TURBODROP_DISCOVERY_PORT") {
        cfg.discovery_port = dp.parse().unwrap_or(cfg.discovery_port);
    }
    if let Ok(d) = std::env::var("TURBODROP_DATA_DIR") {
        cfg.data_dir = PathBuf::from(d);
    }
    Node::start(cfg).await
}

async fn run(cli: Cli) -> anyhow::Result<()> {
    match &cli.cmd {
        Cmd::Devices { wait } => {
            let node = start(&cli).await?;
            tokio::time::sleep(Duration::from_secs(*wait)).await;
            let peers = node.peers();
            if cli.json {
                println!("{}", serde_json::to_string(&peers)?);
            } else if peers.is_empty() {
                println!("No Turbodrop devices found. Phones: run `turbodrop receive` and scan the QR code.");
            } else {
                for p in peers {
                    println!("{:<24} {:<8} {}:{}  {}", p.device.name, p.device.platform, p.address, p.device.port, p.verification);
                }
            }
            Ok(())
        }
        Cmd::Receive { yes, once } => {
            let node = start(&cli).await?;
            if *yes {
                let mut s = node.settings();
                s.require_approval = false;
                node.update_settings(s);
            }
            print_invite(&node, cli.json);
            if !cli.json {
                println!("Saving to {}", node.settings().download_dir.display());
                println!("Waiting for files… (Ctrl+C to stop)\n");
            }
            event_loop(node, cli.json, *once, None).await
        }
        Cmd::Share { paths, text } => {
            let node = start(&cli).await?;
            print_invite(&node, cli.json);
            if !cli.json {
                println!("Scan the code with your phone; the files are offered as soon as it connects.\n");
            }
            event_loop(node, cli.json, false, Some((paths.clone(), text.clone()))).await
        }
        Cmd::Send { paths, to, text, wait } => {
            if paths.is_empty() && text.is_none() {
                bail!("give files to send or --text");
            }
            let node = start(&cli).await?;
            let peer_id = find_peer(&node, to, *wait).await?;
            let tid = node.send_to_peer(&peer_id, paths, text.clone()).await?;
            let mut rx = node.subscribe();
            if !cli.json {
                if let Some(p) = node.peers().into_iter().find(|p| p.device.id == peer_id) {
                    println!("Sending to {} — check the code matches on both screens: {}", p.device.name, p.verification);
                }
            }
            loop {
                match rx.recv().await {
                    Ok(Event::TransferUpdate { transfer }) if transfer.id == tid => {
                        report(&transfer, cli.json);
                        if transfer.status.is_final() {
                            if !cli.json {
                                println!();
                            }
                            return match transfer.status {
                                Status::Done => Ok(()),
                                Status::Declined => Err(anyhow!("the other device declined")),
                                _ => Err(anyhow!(transfer.error.unwrap_or_else(|| "transfer did not finish".into()))),
                            };
                        }
                    }
                    Ok(_) => {}
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {}
                    Err(_) => bail!("engine stopped"),
                }
            }
        }
    }
}

async fn find_peer(node: &Arc<Node>, to: &str, wait: u64) -> anyhow::Result<String> {
    let looks_like_addr = to.chars().next().is_some_and(|c| c.is_ascii_digit()) && to.contains('.');
    if looks_like_addr {
        return Ok(node.add_peer(to).await?.device.id);
    }
    let needle = to.to_lowercase();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(wait);
    loop {
        let peers = node.peers();
        if let Some(p) = peers.iter().find(|p| p.device.id == to || p.device.name.to_lowercase() == needle) {
            return Ok(p.device.id.clone());
        }
        let partial: Vec<_> = peers.iter().filter(|p| p.device.name.to_lowercase().contains(&needle)).collect();
        if partial.len() == 1 {
            return Ok(partial[0].device.id.clone());
        }
        if tokio::time::Instant::now() >= deadline {
            if partial.len() > 1 {
                bail!("several devices match '{to}': {}", partial.iter().map(|p| p.device.name.as_str()).collect::<Vec<_>>().join(", "));
            }
            bail!("no device called '{to}' found (try its IP address)");
        }
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
}

fn print_invite(node: &Node, json: bool) {
    let inv = node.invite();
    if json {
        println!("{}", serde_json::json!({"type": "invite", "invite": inv, "device": node.info()}));
        return;
    }
    let info = node.info();
    println!("\n  Turbodrop · {} · port {}\n", info.name, info.port);
    match inv.urls.first() {
        Some(first) => {
            if let Ok(code) = qrcode::QrCode::new(first.url.as_bytes()) {
                let s = code
                    .render::<qrcode::render::unicode::Dense1x2>()
                    .dark_color(qrcode::render::unicode::Dense1x2::Light)
                    .light_color(qrcode::render::unicode::Dense1x2::Dark)
                    .quiet_zone(true)
                    .build();
                println!("{s}");
            }
            for u in &inv.urls {
                println!("  {:<16} {}", u.label, u.url);
            }
            println!("\n  Scan with the phone camera (same Wi-Fi). Nothing to install.");
        }
        None => println!("  No local network found. Connect to Wi-Fi or Ethernet."),
    }
}

async fn event_loop(node: Arc<Node>, json: bool, once: bool, share: Option<(Vec<PathBuf>, Option<String>)>) -> anyhow::Result<()> {
    let mut rx = node.subscribe();
    let interactive = std::io::stdin().is_terminal() && !json;
    loop {
        let ev = match rx.recv().await {
            Ok(e) => e,
            Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
            Err(_) => return Ok(()),
        };
        if json {
            println!("{}", serde_json::to_string(&ev)?);
        }
        match ev {
            Event::BrowserUpdate { client } if client.online => {
                if !json {
                    println!("📱 {} connected", client.name);
                }
                if let Some((paths, text)) = &share {
                    if let Err(e) = node.send_to_browser(Some(&client.id), paths, text.clone()).await {
                        eprintln!("could not offer files: {e:#}");
                    }
                }
            }
            Event::PeerUpdate { peer } if !json => println!("💻 found {} ({})", peer.device.name, peer.device.platform),
            Event::IncomingRequest { transfer } => {
                if !json {
                    println!(
                        "\n{} wants to send {} file(s), {}. Code: {}",
                        transfer.peer_name,
                        transfer.files.len(),
                        human(transfer.total_bytes),
                        transfer.verification.clone().unwrap_or_default()
                    );
                }
                let accept = if interactive {
                    print!("Accept? [y/N/t=trust] ");
                    let _ = std::io::stdout().flush();
                    let line = tokio::task::spawn_blocking(|| {
                        let mut s = String::new();
                        let _ = std::io::stdin().read_line(&mut s);
                        s
                    })
                    .await
                    .unwrap_or_default();
                    let l = line.trim().to_lowercase();
                    let trust = l == "t";
                    let ok = l == "y" || l == "yes" || trust;
                    let _ = node.respond(&transfer.id, ok, trust);
                    ok
                } else {
                    let _ = node.respond(&transfer.id, false, false);
                    false
                };
                if !accept && !json {
                    println!("Declined.");
                }
            }
            Event::TextReceived { from, text, .. } if !json => println!("\n💬 {}: {}", from.name, text),
            Event::TransferUpdate { transfer } => {
                if !json {
                    report(&transfer, false);
                    if transfer.status.is_final() {
                        println!();
                        if transfer.direction == Direction::In && transfer.status == Status::Done {
                            for f in &transfer.files {
                                println!("   ✓ {}", f.local_path.clone().unwrap_or_else(|| f.path.clone()));
                            }
                        }
                    }
                }
                if once && transfer.status.is_final() && transfer.direction == Direction::In {
                    return Ok(());
                }
            }
            _ => {}
        }
    }
}

fn report(t: &TransferView, json: bool) {
    if json {
        println!("{}", serde_json::json!({"type": "transfer", "transfer": t}));
        return;
    }
    let arrow = if t.direction == Direction::In { "⬇" } else { "⬆" };
    let pct = if t.total_bytes > 0 { t.done_bytes as f64 * 100.0 / t.total_bytes as f64 } else { 100.0 };
    let status = match t.status {
        Status::Waiting => "waiting".to_string(),
        Status::Active => format!("{}/s", human(t.speed as u64)),
        Status::Done => "done".into(),
        Status::Declined => "declined".into(),
        Status::Canceled => "canceled".into(),
        Status::Failed => format!("failed: {}", t.error.clone().unwrap_or_default()),
    };
    print!(
        "\r{arrow} {:<20} {:>5.1}%  {} / {}  {:<24}",
        truncate(&t.peer_name, 20),
        pct,
        human(t.done_bytes),
        human(t.total_bytes),
        status
    );
    let _ = std::io::stdout().flush();
}

fn truncate(s: &str, n: usize) -> String {
    if s.chars().count() <= n {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(n - 1).collect::<String>())
    }
}

fn human(b: u64) -> String {
    const U: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    let mut v = b as f64;
    let mut i = 0;
    while v >= 1024.0 && i < U.len() - 1 {
        v /= 1024.0;
        i += 1;
    }
    if i == 0 {
        format!("{b} B")
    } else {
        format!("{v:.1} {}", U[i])
    }
}
