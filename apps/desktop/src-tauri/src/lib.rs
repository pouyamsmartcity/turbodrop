//! Turbodrop desktop shell: runs the core node in-process and exposes it to the Svelte UI.

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_notification::NotificationExt;
use turbodrop_core::{Config, Direction, Event, Node, PeerKind, Settings, Status};

mod platform;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    pub theme: String,
    pub lang: Option<String>,
    pub accent: String,
    pub autostart: bool,
    pub tray: bool,
    pub context_menu: bool,
    pub notifications: bool,
    pub keep_awake: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            theme: "system".into(),
            lang: None,
            accent: "aurora".into(),
            autostart: false,
            tray: true,
            context_menu: false,
            notifications: true,
            keep_awake: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SettingsFile {
    core: Option<Settings>,
    #[serde(default)]
    app: AppSettings,
}

pub struct AppState {
    node: Arc<Node>,
    app: Mutex<AppSettings>,
    pending_files: Mutex<Vec<String>>,
    quitting: AtomicBool,
    awake: std::sync::mpsc::Sender<bool>,
}

impl AppState {
    fn save(&self) {
        let file = SettingsFile {
            core: Some(self.node.settings()),
            app: self.app.lock().unwrap().clone(),
        };
        let path = self.node.data_dir.join("settings.json");
        if let Ok(b) = serde_json::to_vec_pretty(&file) {
            let _ = std::fs::write(path, b);
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
    info: turbodrop_core::DeviceInfo,
    settings: Settings,
    app: AppSettings,
    invite: turbodrop_core::Invite,
    peers: Vec<turbodrop_core::Peer>,
    clients: Vec<turbodrop_core::BrowserClient>,
    transfers: Vec<turbodrop_core::TransferView>,
    trusted: Vec<turbodrop_core::TrustedDevice>,
    platform: String,
}

fn snapshot(s: &AppState) -> Snapshot {
    let n = &s.node;
    Snapshot {
        info: n.info(),
        settings: n.settings(),
        app: s.app.lock().unwrap().clone(),
        invite: n.invite(),
        peers: n.peers(),
        clients: n.clients(),
        transfers: n.transfers(),
        trusted: n.trusted_devices(),
        platform: n.platform.clone(),
    }
}

type Res<T> = Result<T, String>;

fn e2s(e: impl std::fmt::Display) -> String {
    e.to_string()
}

#[tauri::command]
fn get_state(state: State<'_, AppState>) -> Snapshot {
    snapshot(&state)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Target {
    /// "device", "browser" or "allBrowsers"
    kind: String,
    id: Option<String>,
}

#[tauri::command]
async fn send(
    state: State<'_, AppState>,
    target: Target,
    paths: Vec<String>,
    text: Option<String>,
) -> Res<Vec<String>> {
    let node = state.node.clone();
    let paths: Vec<PathBuf> = paths.into_iter().map(PathBuf::from).collect();
    let text = text.filter(|t| !t.trim().is_empty());
    match target.kind.as_str() {
        "device" => {
            let id = target.id.ok_or("missing device")?;
            node.send_to_peer(&id, &paths, text)
                .await
                .map(|t| vec![t])
                .map_err(e2s)
        }
        "browser" => node
            .send_to_browser(target.id.as_deref(), &paths, text)
            .await
            .map_err(e2s),
        _ => node.send_to_browser(None, &paths, text).await.map_err(e2s),
    }
}

#[tauri::command]
fn respond(state: State<'_, AppState>, id: String, accept: bool, trust: bool) -> Res<()> {
    state.node.respond(&id, accept, trust).map_err(e2s)
}

#[tauri::command]
fn cancel(state: State<'_, AppState>, id: String) -> Res<()> {
    state.node.cancel(&id).map_err(e2s)
}

#[tauri::command]
async fn add_peer(state: State<'_, AppState>, address: String) -> Res<turbodrop_core::Peer> {
    let node = state.node.clone();
    node.add_peer(&address).await.map_err(|e| format!("{e:#}"))
}

#[tauri::command]
fn set_trusted(state: State<'_, AppState>, id: String, trusted: bool) -> Res<()> {
    state.node.set_trusted(&id, trusted).map_err(e2s)
}

#[tauri::command]
fn forget_client(state: State<'_, AppState>, id: String) {
    state.node.forget_client(&id);
}

#[tauri::command]
fn rotate_room(state: State<'_, AppState>) -> Res<turbodrop_core::Invite> {
    state.node.rotate_room().map_err(e2s)?;
    Ok(state.node.invite())
}

#[tauri::command]
fn clear_history(state: State<'_, AppState>) {
    state.node.clear_history();
}

#[tauri::command]
fn update_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: Settings,
    app_settings: AppSettings,
) -> Res<()> {
    let mut s = settings;
    s.device_name = s.device_name.trim().chars().take(40).collect();
    if s.device_name.is_empty() {
        s.device_name = turbodrop_core::node::default_device_name();
    }
    let _ = std::fs::create_dir_all(&s.download_dir);
    state.node.update_settings(s);

    let old = state.app.lock().unwrap().clone();
    if old.autostart != app_settings.autostart {
        use tauri_plugin_autostart::ManagerExt;
        let al = app.autolaunch();
        let r = if app_settings.autostart {
            al.enable()
        } else {
            al.disable()
        };
        r.map_err(e2s)?;
    }
    if old.context_menu != app_settings.context_menu {
        platform::set_context_menu(app_settings.context_menu).map_err(e2s)?;
    }
    if !app_settings.keep_awake {
        let _ = state.awake.send(false);
    }
    *state.app.lock().unwrap() = app_settings;
    state.save();
    Ok(())
}

#[tauri::command]
fn qr_svg(text: String) -> Res<String> {
    use qrcode::render::svg;
    let code = qrcode::QrCode::with_error_correction_level(text.as_bytes(), qrcode::EcLevel::M)
        .map_err(e2s)?;
    Ok(code
        .render::<svg::Color>()
        .min_dimensions(256, 256)
        .dark_color(svg::Color("#0a0f24"))
        .light_color(svg::Color("#ffffff"))
        .quiet_zone(true)
        .build())
}

#[tauri::command]
fn take_pending_files(state: State<'_, AppState>) -> Vec<String> {
    std::mem::take(&mut *state.pending_files.lock().unwrap())
}

#[tauri::command]
fn path_kinds(paths: Vec<String>) -> Vec<(String, bool, u64)> {
    // (path, is_dir, size) for the selection chips.
    paths
        .into_iter()
        .filter_map(|p| {
            let md = std::fs::metadata(&p).ok()?;
            let size = if md.is_dir() {
                dir_size(std::path::Path::new(&p), 0)
            } else {
                md.len()
            };
            Some((p, md.is_dir(), size))
        })
        .collect()
}

fn dir_size(p: &std::path::Path, depth: u32) -> u64 {
    if depth > 24 {
        return 0;
    }
    std::fs::read_dir(p)
        .map(|rd| {
            rd.filter_map(Result::ok)
                .map(|e| match e.file_type() {
                    Ok(t) if t.is_dir() => dir_size(&e.path(), depth + 1),
                    Ok(t) if t.is_file() => e.metadata().map(|m| m.len()).unwrap_or(0),
                    _ => 0,
                })
                .sum()
        })
        .unwrap_or(0)
}

#[tauri::command]
fn show_window(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[tauri::command]
fn open_path(path: String) -> Res<()> {
    tauri_plugin_opener::open_path(path, None::<&str>).map_err(e2s)
}

#[tauri::command]
fn reveal(path: String) -> Res<()> {
    tauri_plugin_opener::reveal_item_in_dir(path).map_err(e2s)
}

#[tauri::command]
fn open_url(url: String) -> Res<()> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("only web links".into());
    }
    tauri_plugin_opener::open_url(url, None::<&str>).map_err(e2s)
}

#[tauri::command]
fn quit(app: AppHandle, state: State<'_, AppState>) {
    state.quitting.store(true, Ordering::SeqCst);
    app.exit(0);
}

/// Files handed to us on the command line (Explorer "Send with Turbodrop", drag onto the exe).
fn file_args(args: &[String]) -> Vec<String> {
    args.iter()
        .skip(1)
        .filter(|a| !a.starts_with("--") && std::path::Path::new(a).exists())
        .cloned()
        .collect()
}

fn notify(app: &AppHandle, title: &str, body: &str) {
    let _ = app.notification().builder().title(title).body(body).show();
}

fn window_visible(app: &AppHandle) -> bool {
    app.get_webview_window("main")
        .map(|w| w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false))
        .unwrap_or(false)
}

/// Forward engine events to the UI; handle notifications and keep-awake on the side.
fn spawn_event_pump(app: AppHandle, node: Arc<Node>) {
    let mut rx = node.subscribe();
    tauri::async_runtime::spawn(async move {
        let mut active: HashSet<String> = HashSet::new();
        loop {
            let ev = match rx.recv().await {
                Ok(e) => e,
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                Err(_) => break,
            };
            let _ = app.emit("td-event", &ev);
            let state = app.state::<AppState>();
            let prefs = state.app.lock().unwrap().clone();
            match &ev {
                Event::TransferUpdate { transfer } => {
                    let was_busy = !active.is_empty();
                    if transfer.status.is_final() {
                        active.remove(&transfer.id);
                    } else {
                        active.insert(transfer.id.clone());
                    }
                    let busy = !active.is_empty();
                    if busy != was_busy && prefs.keep_awake {
                        let _ = state.awake.send(busy);
                    }
                    if transfer.status == Status::Done
                        && transfer.direction == Direction::In
                        && !transfer.files.is_empty()
                        && prefs.notifications
                        && !window_visible(&app)
                    {
                        notify(
                            &app,
                            "Turbodrop",
                            &format!(
                                "Received {} file(s) from {}",
                                transfer.files.len(),
                                transfer.peer_name
                            ),
                        );
                    }
                }
                Event::IncomingRequest { transfer } => {
                    show_window(app.clone());
                    if prefs.notifications {
                        let what = if transfer.files.is_empty() {
                            "a message".to_string()
                        } else {
                            format!("{} file(s)", transfer.files.len())
                        };
                        notify(
                            &app,
                            "Turbodrop",
                            &format!("{} wants to send you {what}", transfer.peer_name),
                        );
                    }
                }
                Event::TextReceived { from, text, .. } => {
                    if prefs.notifications && !window_visible(&app) {
                        let preview: String = text.chars().take(120).collect();
                        notify(&app, &format!("Message from {}", from.name), &preview);
                    }
                }
                Event::BrowserUpdate { client }
                    if client.online && prefs.notifications && !window_visible(&app) =>
                {
                    let _ = PeerKind::Browser;
                    notify(&app, "Turbodrop", &format!("{} connected", client.name));
                }
                _ => {}
            }
        }
    });
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Turbodrop", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;
    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().cloned().expect("bundled icon"))
        .tooltip("Turbodrop")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, e| match e.id.as_ref() {
            "open" => show_window(app.clone()),
            "quit" => {
                app.state::<AppState>()
                    .quitting
                    .store(true, Ordering::SeqCst);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, e| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = e
            {
                show_window(tray.app_handle().clone());
            }
        })
        .build(app)?;
    Ok(())
}

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_env("TURBODROP_LOG")
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let files = file_args(&args);
            if !files.is_empty() {
                app.state::<AppState>()
                    .pending_files
                    .lock()
                    .unwrap()
                    .extend(files.clone());
                let _ = app.emit("open-files", files);
            }
            show_window(app.clone());
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            let data_dir = std::env::var("TURBODROP_DATA_DIR")
                .map(PathBuf::from)
                .unwrap_or_else(|_| turbodrop_core::default_data_dir());
            std::fs::create_dir_all(&data_dir)?;
            let saved: SettingsFile = std::fs::read(data_dir.join("settings.json"))
                .ok()
                .and_then(|b| serde_json::from_slice(&b).ok())
                .unwrap_or_default();
            let mut cfg = Config::new(&data_dir, turbodrop_core::default_download_dir());
            if let Some(core) = saved.core {
                cfg.settings = core;
            }
            if let Ok(p) = std::env::var("TURBODROP_PORT") {
                cfg.port = p.parse().unwrap_or(cfg.port);
            }
            let _ = std::fs::create_dir_all(&cfg.settings.download_dir);
            let node = tauri::async_runtime::block_on(Node::start(cfg))?;
            let args: Vec<String> = std::env::args().collect();
            let minimized = args.iter().any(|a| a == "--minimized");
            let state = AppState {
                node: node.clone(),
                app: Mutex::new(saved.app),
                pending_files: Mutex::new(file_args(&args)),
                quitting: AtomicBool::new(false),
                awake: platform::keep_awake_thread(),
            };
            app.manage(state);
            app.state::<AppState>().save();
            build_tray(app.handle())?;
            spawn_event_pump(app.handle().clone(), node);
            if let Some(w) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                w.on_window_event(move |e| {
                    if let WindowEvent::CloseRequested { api, .. } = e {
                        let st = app_handle.state::<AppState>();
                        if st.app.lock().unwrap().tray && !st.quitting.load(Ordering::SeqCst) {
                            api.prevent_close();
                            if let Some(w) = app_handle.get_webview_window("main") {
                                let _ = w.hide();
                            }
                        }
                    }
                });
                if minimized {
                    let _ = w.hide();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            send,
            respond,
            cancel,
            add_peer,
            set_trusted,
            forget_client,
            rotate_room,
            clear_history,
            update_settings,
            qr_svg,
            take_pending_files,
            path_kinds,
            show_window,
            open_path,
            reveal,
            open_url,
            quit
        ])
        .run(tauri::generate_context!())
        .expect("error while running Turbodrop");
}
