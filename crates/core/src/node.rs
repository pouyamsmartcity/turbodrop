//! The Turbodrop node: one per running app. Owns identity, the HTTP server, discovery,
//! browser sessions, transfers and history, and publishes [`Event`]s to the front-end.

use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU16, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::{anyhow, bail, Context};
use serde::{Deserialize, Serialize};
use tokio::sync::{broadcast, mpsc};

use crate::crypto::{self, Identity, Key};
use crate::events::{now_ms, BrowserClient, Event, Peer, PeerKind, Status, TransferView};
use crate::protocol::{DeviceInfo, Offer, PROTOCOL, VERSION};
use crate::transfer::{Decision, Inbox, Transfer};

/// Settings a front-end may change while running.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub device_name: String,
    pub download_dir: PathBuf,
    /// Unknown native devices need a click before they can send.
    pub require_approval: bool,
    /// Phones that joined through the QR code need a click too (off by default: scanning the
    /// code on this screen already proves the person is here).
    pub ask_browsers: bool,
}

#[derive(Debug, Clone)]
pub struct Config {
    pub settings: Settings,
    pub data_dir: PathBuf,
    /// Preferred HTTP port. The next free port is used when taken; 0 picks any free port.
    pub port: u16,
    /// Multicast discovery port; 0 disables discovery.
    pub discovery_port: u16,
    pub platform: String,
}

impl Config {
    pub fn new(data_dir: impl Into<PathBuf>, download_dir: impl Into<PathBuf>) -> Self {
        Config {
            settings: Settings {
                device_name: default_device_name(),
                download_dir: download_dir.into(),
                require_approval: true,
                ask_browsers: false,
            },
            data_dir: data_dir.into(),
            port: crate::protocol::DEFAULT_PORT,
            discovery_port: crate::protocol::DEFAULT_PORT,
            platform: current_platform().to_string(),
        }
    }
}

pub fn current_platform() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "android") {
        "android"
    } else if cfg!(target_os = "ios") {
        "ios"
    } else {
        "linux"
    }
}

pub fn default_device_name() -> String {
    let h = gethostname::gethostname().to_string_lossy().into_owned();
    if h.is_empty() {
        "Turbodrop".into()
    } else {
        h
    }
}

/// Default folder for received files: ~/Downloads/Turbodrop.
pub fn default_download_dir() -> PathBuf {
    dirs::download_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Turbodrop")
}

pub fn default_data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Turbodrop")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IdentityFile {
    id: String,
    secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RoomFile {
    sid: String,
    key: String,
}

/// The browser room: everyone who scanned the QR code shares its key.
pub struct Room {
    pub sid: String,
    pub root: Key,
    pub data: Key,
    pub token: String,
}

impl Room {
    fn from_key(sid: String, root: Key) -> Self {
        Room {
            data: root.derive(crypto::LABEL_DATA),
            token: crypto::auth_token(&root),
            sid,
            root,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrustedDevice {
    pub id: String,
    pub name: String,
    pub public_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InviteUrl {
    /// Interface name ("Wi-Fi", "Ethernet", ...).
    pub label: String,
    pub ip: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Invite {
    pub urls: Vec<InviteUrl>,
    pub port: u16,
}

pub(crate) struct ClientConn {
    pub info: BrowserClient,
    pub tx: Option<mpsc::UnboundedSender<Vec<u8>>>,
    pub conn: u64,
}

pub struct Node {
    pub identity: Identity,
    pub device_id: String,
    pub platform: String,
    pub data_dir: PathBuf,
    settings: Mutex<Settings>,
    port: AtomicU16,
    pub(crate) discovery_port: u16,
    events: broadcast::Sender<Event>,
    pub(crate) peers: Mutex<HashMap<String, Peer>>,
    pub(crate) room: Mutex<Room>,
    pub(crate) clients: Mutex<HashMap<String, ClientConn>>,
    pub(crate) transfers: Mutex<HashMap<String, Arc<Transfer>>>,
    history: Mutex<Vec<TransferView>>,
    trusted: Mutex<HashMap<String, TrustedDevice>>,
    /// Sender public keys of incoming requests, so "accept and trust" can pin them.
    pending_keys: Mutex<HashMap<String, String>>,
    pub inbox: Inbox,
    pub(crate) http: reqwest::Client,
    conn_counter: AtomicU64,
}

const HISTORY_MAX: usize = 300;

impl Node {
    /// Start the node: load or create the identity, bind the HTTP server, start discovery.
    pub async fn start(config: Config) -> anyhow::Result<Arc<Node>> {
        std::fs::create_dir_all(&config.data_dir)
            .with_context(|| format!("create {}", config.data_dir.display()))?;
        let (device_id, identity) = load_identity(&config.data_dir)?;
        let room = load_room(&config.data_dir)?;
        let trusted: HashMap<String, TrustedDevice> =
            read_json(&config.data_dir.join("trusted.json")).unwrap_or_default();
        let history: Vec<TransferView> =
            read_json(&config.data_dir.join("history.json")).unwrap_or_default();
        let known: Vec<BrowserClient> =
            read_json(&config.data_dir.join("browsers.json")).unwrap_or_default();
        let clients = known
            .into_iter()
            .map(|mut c| {
                c.online = false;
                (
                    c.id.clone(),
                    ClientConn {
                        info: c,
                        tx: None,
                        conn: 0,
                    },
                )
            })
            .collect();
        let (events, _) = broadcast::channel(1024);
        let node = Arc::new(Node {
            inbox: Inbox::new(config.settings.download_dir.clone(), &config.data_dir),
            identity,
            device_id,
            platform: config.platform.clone(),
            data_dir: config.data_dir.clone(),
            settings: Mutex::new(config.settings.clone()),
            port: AtomicU16::new(0),
            discovery_port: config.discovery_port,
            events,
            peers: Mutex::new(HashMap::new()),
            room: Mutex::new(room),
            clients: Mutex::new(clients),
            transfers: Mutex::new(HashMap::new()),
            history: Mutex::new(history),
            trusted: Mutex::new(trusted),
            pending_keys: Mutex::new(HashMap::new()),
            http: reqwest::Client::builder()
                .connect_timeout(Duration::from_secs(5))
                .pool_idle_timeout(Duration::from_secs(30))
                .build()?,
            conn_counter: AtomicU64::new(1),
        });

        let listener = bind_listener(config.port).await?;
        let port = listener.local_addr()?.port();
        node.port.store(port, Ordering::SeqCst);
        let app = crate::server::router(node.clone());
        tokio::spawn(async move {
            if let Err(e) = axum::serve(
                listener,
                app.into_make_service_with_connect_info::<SocketAddr>(),
            )
            .await
            {
                tracing::error!("http server stopped: {e}");
            }
        });
        if config.discovery_port != 0 {
            crate::discovery::spawn(node.clone());
        }
        tracing::info!("turbodrop listening on port {port}");
        Ok(node)
    }

    pub fn port(&self) -> u16 {
        self.port.load(Ordering::SeqCst)
    }

    pub fn settings(&self) -> Settings {
        self.settings.lock().unwrap().clone()
    }

    pub fn update_settings(&self, s: Settings) {
        self.inbox.set_dir(s.download_dir.clone());
        *self.settings.lock().unwrap() = s;
    }

    pub fn info(&self) -> DeviceInfo {
        DeviceInfo {
            id: self.device_id.clone(),
            name: self.settings.lock().unwrap().device_name.clone(),
            platform: self.platform.clone(),
            version: VERSION.to_string(),
            port: self.port(),
            public_key: self.identity.public_b64(),
            fingerprint: self.identity.fingerprint(),
        }
    }

    pub fn protocol(&self) -> &'static str {
        PROTOCOL
    }

    pub fn subscribe(&self) -> broadcast::Receiver<Event> {
        self.events.subscribe()
    }

    pub(crate) fn emit(&self, e: Event) {
        let _ = self.events.send(e);
    }

    pub(crate) fn emit_transfer(&self, t: &Transfer) {
        self.emit(Event::TransferUpdate { transfer: t.view() });
    }

    // ----- peers & trust -------------------------------------------------------------------

    pub fn peers(&self) -> Vec<Peer> {
        let mut v: Vec<Peer> = self.peers.lock().unwrap().values().cloned().collect();
        v.sort_by(|a, b| {
            a.device
                .name
                .to_lowercase()
                .cmp(&b.device.name.to_lowercase())
        });
        v
    }

    pub(crate) fn trust_state(&self, device_id: &str, public_key: &str) -> (bool, bool) {
        match self.trusted.lock().unwrap().get(device_id) {
            Some(t) if t.public_key == public_key => (true, false),
            Some(_) => (false, true),
            None => (false, false),
        }
    }

    /// Insert or refresh a peer; publishes an update when something visible changed.
    pub(crate) fn upsert_peer(&self, device: DeviceInfo, address: String, source: &str) -> Peer {
        let (trusted, key_changed) = self.trust_state(&device.id, &device.public_key);
        let verification = crypto::public_from_b64(&device.public_key)
            .map(|pk| crypto::verification_code(self.identity.public.as_bytes(), pk.as_bytes()))
            .unwrap_or_default();
        let peer = Peer {
            device,
            address,
            last_seen: now_ms(),
            source: source.to_string(),
            trusted,
            verification,
            key_changed,
        };
        let changed = {
            let mut peers = self.peers.lock().unwrap();
            let changed = match peers.get(&peer.device.id) {
                Some(old) => {
                    old.device != peer.device
                        || old.address != peer.address
                        || old.trusted != peer.trusted
                }
                None => true,
            };
            let mut p = peer.clone();
            if let Some(old) = peers.get(&p.device.id) {
                if old.source == "manual" {
                    p.source = "manual".into();
                }
            }
            peers.insert(p.device.id.clone(), p);
            changed
        };
        if changed {
            self.emit(Event::PeerUpdate { peer: peer.clone() });
        }
        peer
    }

    /// Add a device by address (`192.168.1.20` or `192.168.1.20:47474`), e.g. when multicast is blocked.
    pub async fn add_peer(&self, address: &str) -> anyhow::Result<Peer> {
        let addr = address
            .trim()
            .trim_start_matches("http://")
            .trim_end_matches('/');
        let with_port = if addr.contains(':') {
            addr.to_string()
        } else {
            format!("{addr}:{}", crate::protocol::DEFAULT_PORT)
        };
        let url = format!("http://{with_port}/api/v1/info");
        let info: DeviceInfo = self
            .http
            .get(&url)
            .timeout(Duration::from_secs(5))
            .send()
            .await
            .with_context(|| format!("could not reach {with_port}"))?
            .error_for_status()?
            .json()
            .await
            .context("that address is not a Turbodrop device")?;
        if info.id == self.device_id {
            bail!("that is this device");
        }
        let host = with_port
            .rsplit_once(':')
            .map(|(h, _)| h.to_string())
            .unwrap_or(with_port.clone());
        Ok(self.upsert_peer(info, host, "manual"))
    }

    pub fn set_trusted(&self, device_id: &str, trusted: bool) -> anyhow::Result<()> {
        let peer = self.peers.lock().unwrap().get(device_id).cloned();
        {
            let mut t = self.trusted.lock().unwrap();
            if trusted {
                let p = peer.clone().ok_or_else(|| anyhow!("unknown device"))?;
                t.insert(
                    device_id.to_string(),
                    TrustedDevice {
                        id: device_id.into(),
                        name: p.device.name.clone(),
                        public_key: p.device.public_key.clone(),
                    },
                );
            } else {
                t.remove(device_id);
            }
            write_json(&self.data_dir.join("trusted.json"), &*t);
        }
        if let Some(p) = peer {
            self.upsert_peer(p.device, p.address, &p.source);
        }
        Ok(())
    }

    pub(crate) fn trust_sender(&self, id: &str, name: &str, public_key: &str) {
        let mut t = self.trusted.lock().unwrap();
        t.insert(
            id.to_string(),
            TrustedDevice {
                id: id.into(),
                name: name.into(),
                public_key: public_key.into(),
            },
        );
        write_json(&self.data_dir.join("trusted.json"), &*t);
    }

    pub fn trusted_devices(&self) -> Vec<TrustedDevice> {
        self.trusted.lock().unwrap().values().cloned().collect()
    }

    // ----- browser room ----------------------------------------------------------------------

    /// QR links for every usable network interface. The key travels in the URL fragment,
    /// which browsers never send to the server.
    pub fn invite(&self) -> Invite {
        let room = self.room.lock().unwrap();
        let port = self.port();
        let mut addrs = lan_addresses();
        if addrs.is_empty() {
            // No network: still usable from a browser on this same computer.
            addrs.push(("This computer".into(), IpAddr::V4(Ipv4Addr::LOCALHOST)));
        }
        let urls = addrs
            .into_iter()
            .map(|(label, ip)| InviteUrl {
                url: format!("http://{ip}:{port}/#{}.{}", room.sid, room.root.to_b64()),
                ip: ip.to_string(),
                label,
            })
            .collect();
        Invite { urls, port }
    }

    /// New room key: every phone has to scan again.
    pub fn rotate_room(&self) -> anyhow::Result<()> {
        let room = Room::from_key(crypto::random_id(9), Key::random());
        write_json(
            &self.data_dir.join("room.json"),
            &RoomFile {
                sid: room.sid.clone(),
                key: room.root.to_b64(),
            },
        );
        *self.room.lock().unwrap() = room;
        let mut clients = self.clients.lock().unwrap();
        for c in clients.values_mut() {
            c.tx = None;
        }
        clients.clear();
        drop(clients);
        self.save_clients();
        self.emit(Event::RoomRotated);
        Ok(())
    }

    pub fn clients(&self) -> Vec<BrowserClient> {
        let mut v: Vec<BrowserClient> = self
            .clients
            .lock()
            .unwrap()
            .values()
            .map(|c| c.info.clone())
            .collect();
        v.sort_by(|a, b| b.online.cmp(&a.online).then(b.last_seen.cmp(&a.last_seen)));
        v
    }

    pub fn forget_client(&self, id: &str) {
        self.clients.lock().unwrap().remove(id);
        self.save_clients();
    }

    pub(crate) fn save_clients(&self) {
        let list: Vec<BrowserClient> = self
            .clients
            .lock()
            .unwrap()
            .values()
            .map(|c| c.info.clone())
            .collect();
        write_json(&self.data_dir.join("browsers.json"), &list);
    }

    pub(crate) fn next_conn_id(&self) -> u64 {
        self.conn_counter.fetch_add(1, Ordering::SeqCst)
    }

    /// Push a sealed event to one browser. Returns false when it is offline.
    pub(crate) fn push_to_client(&self, client_id: &str, value: &serde_json::Value) -> bool {
        let data = self.room.lock().unwrap().data.clone();
        let sealed = crypto::seal_json(&data, "event", value);
        let clients = self.clients.lock().unwrap();
        match clients.get(client_id).and_then(|c| c.tx.as_ref()) {
            Some(tx) => tx.send(sealed).is_ok(),
            None => false,
        }
    }

    // ----- transfers -------------------------------------------------------------------------

    pub(crate) fn add_transfer(&self, t: Arc<Transfer>) {
        self.transfers.lock().unwrap().insert(t.id.clone(), t);
    }

    pub fn transfer(&self, id: &str) -> Option<Arc<Transfer>> {
        self.transfers.lock().unwrap().get(id).cloned()
    }

    /// Active transfers first, then history (newest first).
    pub fn transfers(&self) -> Vec<TransferView> {
        let mut active: Vec<TransferView> = self
            .transfers
            .lock()
            .unwrap()
            .values()
            .map(|t| t.view())
            .filter(|v| !v.status.is_final())
            .collect();
        active.sort_by_key(|t| std::cmp::Reverse(t.started_at));
        let history = self.history.lock().unwrap();
        active.extend(history.iter().cloned());
        active
    }

    pub fn history(&self) -> Vec<TransferView> {
        self.history.lock().unwrap().clone()
    }

    pub fn clear_history(&self) {
        let mut h = self.history.lock().unwrap();
        h.clear();
        write_json(&self.data_dir.join("history.json"), &*h);
    }

    /// Publish the final state of a transfer, record it in history, and drop it from the active
    /// map a little later (late retries still find it meanwhile).
    pub(crate) fn finish(self: &Arc<Self>, t: &Arc<Transfer>) {
        let view = t.view();
        self.emit(Event::TransferUpdate {
            transfer: view.clone(),
        });
        {
            let mut h = self.history.lock().unwrap();
            h.retain(|x| x.id != view.id);
            h.insert(0, view);
            h.truncate(HISTORY_MAX);
            write_json(&self.data_dir.join("history.json"), &*h);
        }
        let node = self.clone();
        let id = t.id.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_secs(120)).await;
            node.transfers.lock().unwrap().remove(&id);
        });
    }

    /// Accept or decline an incoming request. `trust` remembers the sending device.
    pub fn respond(&self, transfer_id: &str, accept: bool, trust: bool) -> anyhow::Result<()> {
        let t = self
            .transfer(transfer_id)
            .ok_or_else(|| anyhow!("unknown transfer"))?;
        let tx = t
            .decision
            .lock()
            .unwrap()
            .take()
            .ok_or_else(|| anyhow!("transfer is not waiting"))?;
        if accept && trust && t.kind == PeerKind::Device {
            if let Some(pk) = self.pending_sender_key(&t) {
                self.trust_sender(&t.peer_id, &t.peer_name, &pk);
                if let Some(p) = self.peers.lock().unwrap().get_mut(&t.peer_id) {
                    p.trusted = true;
                }
            }
        }
        let _ = tx.send(if accept {
            Decision::Accept
        } else {
            Decision::Decline
        });
        Ok(())
    }

    fn pending_sender_key(&self, t: &Transfer) -> Option<String> {
        self.pending_keys.lock().unwrap().get(&t.id).cloned()
    }

    /// Cancel any transfer, either direction.
    pub fn cancel(self: &Arc<Self>, transfer_id: &str) -> anyhow::Result<()> {
        let t = self
            .transfer(transfer_id)
            .ok_or_else(|| anyhow!("unknown transfer"))?;
        if t.cancel() {
            if t.direction == crate::events::Direction::In {
                self.inbox.discard_unstarted(&t);
            }
            if t.kind == PeerKind::Browser && t.direction == crate::events::Direction::Out {
                self.push_to_client(
                    &t.peer_id,
                    &serde_json::json!({"type": "cancel", "transferId": t.id}),
                );
            }
            self.finish(&t);
        }
        Ok(())
    }

    /// Send files and/or text to a native device found by discovery or added by address.
    pub async fn send_to_peer(
        self: &Arc<Self>,
        peer_id: &str,
        paths: &[PathBuf],
        text: Option<String>,
    ) -> anyhow::Result<String> {
        let peer = self
            .peers
            .lock()
            .unwrap()
            .get(peer_id)
            .cloned()
            .ok_or_else(|| anyhow!("unknown device"))?;
        crate::sender::send_to_peer(self.clone(), peer, paths, text).await
    }

    /// Send files and/or text to phones in the browser room. `client_id = None` sends to every
    /// phone that is online right now.
    pub async fn send_to_browser(
        self: &Arc<Self>,
        client_id: Option<&str>,
        paths: &[PathBuf],
        text: Option<String>,
    ) -> anyhow::Result<Vec<String>> {
        crate::sender::send_to_browsers(self.clone(), client_id, paths, text).await
    }

    pub(crate) fn remember_sender_key(&self, transfer_id: &str, public_key: &str) {
        self.pending_keys
            .lock()
            .unwrap()
            .insert(transfer_id.to_string(), public_key.to_string());
    }

    pub(crate) fn offers_for_client(&self, client_id: &str) -> Vec<Offer> {
        let me = self.info();
        self.transfers
            .lock()
            .unwrap()
            .values()
            .filter(|t| {
                t.kind == PeerKind::Browser
                    && t.direction == crate::events::Direction::Out
                    && t.peer_id == client_id
                    && !t.status().is_final()
            })
            .map(|t| crate::sender::browser_offer(&me, t))
            .collect()
    }

    pub(crate) fn wait_decision_slot(
        &self,
        t: &Transfer,
    ) -> tokio::sync::oneshot::Receiver<Decision> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        *t.decision.lock().unwrap() = Some(tx);
        rx
    }

    /// Wait for the user to accept (up to two minutes). Publishes the request first.
    pub(crate) async fn ask_user(&self, t: &Arc<Transfer>) -> bool {
        let rx = self.wait_decision_slot(t);
        self.emit(Event::IncomingRequest { transfer: t.view() });
        match tokio::time::timeout(Duration::from_secs(120), rx).await {
            Ok(Ok(Decision::Accept)) => true,
            _ => {
                if t.status() == Status::Waiting {
                    t.set_status(Status::Declined, None);
                }
                false
            }
        }
    }
}

async fn bind_listener(port: u16) -> anyhow::Result<tokio::net::TcpListener> {
    if port == 0 {
        return Ok(tokio::net::TcpListener::bind((Ipv4Addr::UNSPECIFIED, 0)).await?);
    }
    for p in port..port.saturating_add(20) {
        if let Ok(l) = tokio::net::TcpListener::bind((Ipv4Addr::UNSPECIFIED, p)).await {
            return Ok(l);
        }
    }
    Ok(tokio::net::TcpListener::bind((Ipv4Addr::UNSPECIFIED, 0)).await?)
}

/// Private IPv4 addresses a phone on the same network can reach, best first.
pub fn lan_addresses() -> Vec<(String, IpAddr)> {
    let mut v: Vec<(String, IpAddr, u8)> = if_addrs::get_if_addrs()
        .unwrap_or_default()
        .into_iter()
        .filter(|i| !i.is_loopback())
        .filter_map(|i| match i.ip() {
            IpAddr::V4(ip) if ip.is_private() || is_cgnat(&ip) => {
                let name = i.name.clone();
                let lname = name.to_lowercase();
                // Virtual adapters (WSL, Hyper-V, Docker, VirtualBox, VMware) are unreachable from a phone.
                let virt = [
                    "vethernet",
                    "wsl",
                    "hyper-v",
                    "docker",
                    "virtualbox",
                    "vmware",
                    "vbox",
                    "loopback",
                    "br-",
                    "veth",
                ]
                .iter()
                .any(|k| lname.contains(k));
                if virt {
                    return None;
                }
                let rank = if lname.contains("wi-fi")
                    || lname.contains("wlan")
                    || lname.contains("wireless")
                    || lname.starts_with("wl")
                {
                    0
                } else if lname.contains("ethernet")
                    || lname.starts_with("en")
                    || lname.starts_with("eth")
                {
                    1
                } else if is_cgnat(&ip) {
                    3
                } else {
                    2
                };
                Some((pretty_iface(&name, &ip), IpAddr::V4(ip), rank))
            }
            _ => None,
        })
        .collect();
    v.sort_by_key(|x| x.2);
    v.dedup_by(|a, b| a.1 == b.1);
    v.into_iter().map(|(l, ip, _)| (l, ip)).collect()
}

fn is_cgnat(ip: &Ipv4Addr) -> bool {
    // 100.64.0.0/10 — Tailscale and carrier-grade NAT.
    let o = ip.octets();
    o[0] == 100 && (64..128).contains(&o[1])
}

fn pretty_iface(name: &str, ip: &Ipv4Addr) -> String {
    let l = name.to_lowercase();
    if is_cgnat(ip) {
        "Tailscale / VPN".into()
    } else if l.contains("wi-fi") || l.contains("wlan") || l.starts_with("wl") {
        "Wi-Fi".into()
    } else if l.contains("local area connection*") || l.contains("hotspot") {
        "Hotspot".into()
    } else if l.contains("ethernet") || l.starts_with("en") || l.starts_with("eth") {
        "Ethernet".into()
    } else {
        name.to_string()
    }
}

fn load_identity(dir: &Path) -> anyhow::Result<(String, Identity)> {
    let path = dir.join("identity.json");
    if let Some(f) = read_json::<IdentityFile>(&path) {
        if let Ok(id) = Identity::from_secret_b64(&f.secret) {
            return Ok((f.id, id));
        }
    }
    let identity = Identity::generate();
    let id = crypto::random_id(12);
    write_json(
        &path,
        &IdentityFile {
            id: id.clone(),
            secret: identity.secret_b64(),
        },
    );
    Ok((id, identity))
}

fn load_room(dir: &Path) -> anyhow::Result<Room> {
    let path = dir.join("room.json");
    if let Some(f) = read_json::<RoomFile>(&path) {
        if let Ok(k) = Key::from_b64(&f.key) {
            return Ok(Room::from_key(f.sid, k));
        }
    }
    let room = Room::from_key(crypto::random_id(9), Key::random());
    write_json(
        &path,
        &RoomFile {
            sid: room.sid.clone(),
            key: room.root.to_b64(),
        },
    );
    Ok(room)
}

pub(crate) fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    std::fs::read(path)
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
}

pub(crate) fn write_json<T: Serialize + ?Sized>(path: &Path, value: &T) {
    if let Some(p) = path.parent() {
        let _ = std::fs::create_dir_all(p);
    }
    let tmp = path.with_extension("tmp");
    if let Ok(bytes) = serde_json::to_vec_pretty(value) {
        if std::fs::write(&tmp, bytes).is_ok() {
            let _ = std::fs::rename(&tmp, path);
        }
    }
}
