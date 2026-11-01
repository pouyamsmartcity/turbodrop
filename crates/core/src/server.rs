//! HTTP API (browser room + native peers) and the embedded web client.

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{ConnectInfo, DefaultBodyLimit, Path, Query, State};
use axum::http::{header, HeaderMap, HeaderValue, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post, put};
use axum::{Json, Router};
use futures_util::{SinkExt, StreamExt};
use rust_embed::RustEmbed;
use serde::Deserialize;
use serde_json::json;

use crate::crypto::{self, Key};
use crate::events::{now_ms, BrowserClient, Direction, Event, FileStatus, PeerKind, Status};
use crate::node::{ClientConn, Node};
use crate::protocol::{Hello, Offer, OfferReply, Welcome, CHUNK_SIZE};
use crate::transfer::{ChunkError, ChunkOutcome, Transfer, TransferInit};

#[derive(RustEmbed)]
#[folder = "../../web/dist"]
struct WebAssets;

type S = State<Arc<Node>>;

pub fn router(node: Arc<Node>) -> Router {
    Router::new()
        .route("/api/v1/info", get(info))
        .route("/api/v1/b/hello", post(b_hello))
        .route("/api/v1/b/ws", get(b_ws))
        .route("/api/v1/b/offer", post(b_offer))
        .route("/api/v1/b/upload/{tid}/{fid}", put(b_upload))
        .route("/api/v1/b/status/{tid}/{fid}", get(status))
        .route("/api/v1/b/download/{tid}/{fid}", get(b_download))
        .route("/api/v1/b/done/{tid}/{fid}", post(b_done))
        .route("/api/v1/b/cancel/{tid}", post(b_cancel))
        .route("/api/v1/p/offer", post(p_offer))
        .route("/api/v1/p/upload/{tid}/{fid}", put(p_upload))
        .route("/api/v1/p/status/{tid}/{fid}", get(status))
        .route("/api/v1/p/cancel/{tid}", post(p_cancel))
        .fallback(static_file)
        .layer(DefaultBodyLimit::max(CHUNK_SIZE + 64 * 1024))
        .with_state(node)
}

fn err(code: StatusCode, msg: &str) -> Response {
    (code, Json(json!({ "error": msg }))).into_response()
}

fn sealed(bytes: Vec<u8>) -> Response {
    ([(header::CONTENT_TYPE, "application/octet-stream"), (header::CACHE_CONTROL, "no-store")], bytes).into_response()
}

async fn info(State(node): S) -> Response {
    let mut r = Json(node.info()).into_response();
    r.headers_mut().insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
    r
}

// ----- browser room ----------------------------------------------------------------------------

fn ct_eq(a: &str, b: &str) -> bool {
    a.len() == b.len() && a.bytes().zip(b.bytes()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// Check the room credentials; returns the data key.
fn room_key(node: &Node, sid: Option<&str>, auth: Option<&str>) -> Option<Key> {
    let room = node.room.lock().unwrap();
    match (sid, auth) {
        (Some(s), Some(a)) if ct_eq(s, &room.sid) && ct_eq(a, &room.token) => Some(room.data.clone()),
        _ => None,
    }
}

fn header_str<'a>(h: &'a HeaderMap, name: &str) -> Option<&'a str> {
    h.get(name).and_then(|v| v.to_str().ok())
}

fn browser_key(node: &Node, h: &HeaderMap) -> Result<Key, Response> {
    room_key(node, header_str(h, "x-td-sid"), header_str(h, "x-td-auth"))
        .ok_or_else(|| err(StatusCode::UNAUTHORIZED, "scan the QR code again"))
}

async fn b_hello(State(node): S, h: HeaderMap, body: Bytes) -> Response {
    let key = match browser_key(&node, &h) {
        Ok(k) => k,
        Err(r) => return r,
    };
    let hello: Hello = match crypto::open_json(&key, "hello", &body) {
        Ok(v) => v,
        Err(_) => return err(StatusCode::BAD_REQUEST, "bad hello"),
    };
    if hello.client_id.len() > 64 || hello.client_id.is_empty() {
        return err(StatusCode::BAD_REQUEST, "bad client id");
    }
    let name: String = hello.name.chars().take(60).collect();
    let platform: String = hello.platform.chars().take(20).collect();
    let info = {
        let mut clients = node.clients.lock().unwrap();
        let entry = clients.entry(hello.client_id.clone()).or_insert_with(|| ClientConn {
            info: BrowserClient { id: hello.client_id.clone(), name: name.clone(), platform: platform.clone(), online: false, last_seen: 0 },
            tx: None,
            conn: 0,
        });
        entry.info.name = name;
        entry.info.platform = platform;
        entry.info.last_seen = now_ms();
        entry.info.clone()
    };
    node.save_clients();
    node.emit(Event::BrowserUpdate { client: info });
    let welcome = Welcome { host: node.info(), chunk_size: CHUNK_SIZE, pending: node.offers_for_client(&hello.client_id) };
    sealed(crypto::seal_json(&key, "welcome", &welcome))
}

#[derive(Deserialize)]
struct WsQuery {
    sid: String,
    auth: String,
    client: String,
}

async fn b_ws(State(node): S, Query(q): Query<WsQuery>, ws: WebSocketUpgrade) -> Response {
    if room_key(&node, Some(&q.sid), Some(&q.auth)).is_none() {
        return err(StatusCode::UNAUTHORIZED, "scan the QR code again");
    }
    if !node.clients.lock().unwrap().contains_key(&q.client) {
        return err(StatusCode::FORBIDDEN, "say hello first");
    }
    ws.on_upgrade(move |socket| ws_session(node, q.client, socket))
}

async fn ws_session(node: Arc<Node>, client: String, socket: WebSocket) {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Vec<u8>>();
    let conn = node.next_conn_id();
    let info = {
        let mut clients = node.clients.lock().unwrap();
        let Some(c) = clients.get_mut(&client) else { return };
        c.tx = Some(tx);
        c.conn = conn;
        c.info.online = true;
        c.info.last_seen = now_ms();
        c.info.clone()
    };
    node.emit(Event::BrowserUpdate { client: info });
    let (mut sink, mut stream) = socket.split();
    let mut ping = tokio::time::interval(std::time::Duration::from_secs(20));
    loop {
        tokio::select! {
            out = rx.recv() => match out {
                Some(bytes) => if sink.send(Message::Binary(bytes.into())).await.is_err() { break },
                None => break,
            },
            msg = stream.next() => match msg {
                Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                Some(Ok(_)) => {}
            },
            _ = ping.tick() => if sink.send(Message::Ping(Vec::new().into())).await.is_err() { break },
        }
    }
    let info = {
        let mut clients = node.clients.lock().unwrap();
        match clients.get_mut(&client) {
            Some(c) if c.conn == conn => {
                c.tx = None;
                c.info.online = false;
                c.info.last_seen = now_ms();
                Some(c.info.clone())
            }
            _ => None,
        }
    };
    if let Some(info) = info {
        node.save_clients();
        node.emit(Event::BrowserUpdate { client: info });
    }
}

async fn b_offer(State(node): S, h: HeaderMap, body: Bytes) -> Response {
    let key = match browser_key(&node, &h) {
        Ok(k) => k,
        Err(r) => return r,
    };
    let offer: Offer = match crypto::open_json(&key, "offer", &body) {
        Ok(v) => v,
        Err(_) => return err(StatusCode::BAD_REQUEST, "bad offer"),
    };
    let platform = node
        .clients
        .lock()
        .unwrap()
        .get(&offer.sender.id)
        .map(|c| c.info.platform.clone())
        .unwrap_or_else(|| offer.sender.platform.clone());
    let ask = node.settings().ask_browsers;
    let reply = receive_offer(&node, key.clone(), offer, PeerKind::Browser, platform, None, ask).await;
    sealed(crypto::seal_json(&key, "offer-reply", &reply))
}

/// Shared by browsers and native peers: plan files, maybe ask the user, register the transfer.
async fn receive_offer(
    node: &Arc<Node>,
    key: Key,
    offer: Offer,
    kind: PeerKind,
    platform: String,
    verification: Option<String>,
    ask: bool,
) -> OfferReply {
    if offer.files.len() > 100_000 || offer.transfer_id.len() > 64 || offer.transfer_id.is_empty() {
        return OfferReply { accepted: false, files: vec![], reason: Some("invalid offer".into()) };
    }
    if node.transfer(&offer.transfer_id).is_some() {
        return OfferReply { accepted: false, files: vec![], reason: Some("duplicate transfer id".into()) };
    }
    let mut seen = std::collections::HashSet::new();
    if !offer.files.iter().all(|f| seen.insert(f.id.clone())) {
        return OfferReply { accepted: false, files: vec![], reason: Some("duplicate file id".into()) };
    }
    let slots = offer.files.iter().map(|m| node.inbox.plan(&offer.sender.id, m)).collect::<Vec<_>>();
    let t = Arc::new(Transfer::new(TransferInit {
        id: offer.transfer_id.clone(),
        direction: Direction::In,
        kind,
        key,
        peer_id: offer.sender.id.clone(),
        peer_name: offer.sender.name.chars().take(60).collect(),
        peer_platform: platform,
        text: offer.text.clone().map(|s| s.chars().take(100_000).collect()),
        verification,
        files: slots,
        status: Status::Waiting,
    }));
    node.add_transfer(t.clone());
    if let Some(pk) = &offer.sender.public_key {
        node.remember_sender_key(&t.id, pk);
    }

    if ask && !node.ask_user(&t).await {
        node.finish(&t);
        return OfferReply { accepted: false, files: vec![], reason: Some("declined".into()) };
    }
    if let Some(text) = &t.text {
        node.emit(Event::TextReceived { transfer_id: t.id.clone(), from: offer.sender.clone(), text: text.clone() });
    }
    t.set_status(Status::Active, None);
    let plans = t.plans();
    if t.settle() {
        node.finish(&t);
    } else {
        node.emit_transfer(&t);
    }
    OfferReply { accepted: true, files: plans, reason: None }
}

#[derive(Deserialize)]
struct ChunkQuery {
    i: u64,
    #[serde(default)]
    last: u8,
}

async fn b_upload(State(node): S, h: HeaderMap, Path((tid, fid)): Path<(String, String)>, Query(q): Query<ChunkQuery>, body: Bytes) -> Response {
    if let Err(r) = browser_key(&node, &h) {
        return r;
    }
    store_chunk(&node, PeerKind::Browser, &tid, &fid, q, &body).await
}

async fn p_upload(State(node): S, Path((tid, fid)): Path<(String, String)>, Query(q): Query<ChunkQuery>, body: Bytes) -> Response {
    store_chunk(&node, PeerKind::Device, &tid, &fid, q, &body).await
}

async fn store_chunk(node: &Arc<Node>, kind: PeerKind, tid: &str, fid: &str, q: ChunkQuery, body: &[u8]) -> Response {
    let Some(t) = node.transfer(tid) else { return err(StatusCode::NOT_FOUND, "unknown transfer") };
    if t.kind != kind || t.direction != Direction::In {
        return err(StatusCode::NOT_FOUND, "unknown transfer");
    }
    if t.is_canceled() || matches!(t.status(), Status::Canceled | Status::Declined | Status::Failed) {
        return err(StatusCode::GONE, "transfer canceled");
    }
    let Some(idx) = t.file_index(fid) else { return err(StatusCode::NOT_FOUND, "unknown file") };
    let last = q.last == 1;
    let plain = match crypto::open(&t.key, &crypto::chunk_aad(tid, fid, q.i, last), body) {
        Ok(p) => p,
        Err(_) => return err(StatusCode::BAD_REQUEST, "chunk failed authentication"),
    };
    match node.inbox.write_chunk(&t, idx, q.i, last, &plain).await {
        Ok(outcome) => {
            let next = t.state.lock().unwrap().files[idx].next_index;
            match outcome {
                ChunkOutcome::Completed(_) => {
                    if t.settle() {
                        node.finish(&t);
                    } else {
                        node.emit_transfer(&t);
                    }
                }
                ChunkOutcome::Stored => {
                    // Throttled progress events.
                    let due = {
                        let mut st = t.state.lock().unwrap();
                        let due = st.last_emit.map_or(true, |x| x.elapsed() >= std::time::Duration::from_millis(150));
                        if due {
                            st.last_emit = Some(std::time::Instant::now());
                        }
                        due
                    };
                    if due {
                        node.emit_transfer(&t);
                    }
                }
                ChunkOutcome::Duplicate => {}
            }
            Json(json!({ "next": next })).into_response()
        }
        Err(ChunkError::OutOfOrder { expected, .. }) => (StatusCode::CONFLICT, Json(json!({ "next": expected }))).into_response(),
        Err(ChunkError::Inactive) => err(StatusCode::GONE, "transfer canceled"),
        Err(ChunkError::BadSize) => err(StatusCode::BAD_REQUEST, "chunk has the wrong size"),
        Err(ChunkError::Io(e)) => {
            t.set_status(Status::Failed, Some(format!("could not save: {e}")));
            node.finish(&t);
            err(StatusCode::INTERNAL_SERVER_ERROR, "could not save the file")
        }
    }
}

async fn status(State(node): S, Path((tid, fid)): Path<(String, String)>) -> Response {
    let Some(t) = node.transfer(&tid) else { return err(StatusCode::NOT_FOUND, "unknown transfer") };
    let st = t.state.lock().unwrap();
    match st.files.iter().find(|f| f.meta.id == fid) {
        Some(f) => Json(json!({ "next": f.next_index, "status": t.view_locked(&st).status })).into_response(),
        None => err(StatusCode::NOT_FOUND, "unknown file"),
    }
}

/// Host → phone: serve one sealed chunk of an offered file.
async fn b_download(State(node): S, h: HeaderMap, Path((tid, fid)): Path<(String, String)>, Query(q): Query<HashMap<String, String>>) -> Response {
    if let Err(r) = browser_key(&node, &h) {
        return r;
    }
    let Some(t) = node.transfer(&tid) else { return err(StatusCode::NOT_FOUND, "unknown transfer") };
    if t.kind != PeerKind::Browser || t.direction != Direction::Out {
        return err(StatusCode::NOT_FOUND, "unknown transfer");
    }
    if t.status().is_final() && t.status() != Status::Done {
        return err(StatusCode::GONE, "transfer canceled");
    }
    let Some(idx) = t.file_index(&fid) else { return err(StatusCode::NOT_FOUND, "unknown file") };
    let i: u64 = q.get("i").and_then(|s| s.parse().ok()).unwrap_or(0);
    let slot = t.state.lock().unwrap().files[idx].clone();
    let chunks = slot.meta.chunk_count();
    if i >= chunks {
        return err(StatusCode::RANGE_NOT_SATISFIABLE, "no such chunk");
    }
    let data = match crate::sender::read_chunk(&slot.local, slot.meta.size, i).await {
        Ok(d) => d,
        Err(_) => {
            t.set_status(Status::Failed, Some(format!("{} is no longer available", slot.meta.name)));
            node.finish(&t);
            return err(StatusCode::GONE, "file is no longer available");
        }
    };
    let last = i + 1 == chunks;
    let body = crypto::seal(&t.key, &crypto::chunk_aad(&tid, &fid, i, last), &data);
    let next = (i + 1).max(slot.next_index);
    let done = (next * CHUNK_SIZE as u64).min(slot.meta.size);
    if t.progress(idx, next, done, false) {
        node.emit_transfer(&t);
    }
    sealed(body)
}

async fn b_done(State(node): S, h: HeaderMap, Path((tid, fid)): Path<(String, String)>) -> Response {
    if let Err(r) = browser_key(&node, &h) {
        return r;
    }
    let Some(t) = node.transfer(&tid) else { return err(StatusCode::NOT_FOUND, "unknown transfer") };
    let Some(idx) = t.file_index(&fid) else { return err(StatusCode::NOT_FOUND, "unknown file") };
    {
        let mut st = t.state.lock().unwrap();
        let f = &mut st.files[idx];
        f.status = FileStatus::Done;
        f.done_bytes = f.meta.size;
        f.next_index = f.meta.chunk_count();
    }
    if t.settle() {
        node.finish(&t);
    } else {
        node.emit_transfer(&t);
    }
    Json(json!({ "ok": true })).into_response()
}

#[derive(Deserialize)]
struct CancelQuery {
    #[serde(default)]
    decline: u8,
}

async fn b_cancel(State(node): S, h: HeaderMap, Path(tid): Path<String>, Query(q): Query<CancelQuery>) -> Response {
    if let Err(r) = browser_key(&node, &h) {
        return r;
    }
    cancel_common(&node, &tid, PeerKind::Browser, q.decline == 1)
}

async fn p_cancel(State(node): S, Path(tid): Path<String>) -> Response {
    cancel_common(&node, &tid, PeerKind::Device, false)
}

fn cancel_common(node: &Arc<Node>, tid: &str, kind: PeerKind, decline: bool) -> Response {
    let Some(t) = node.transfer(tid) else { return err(StatusCode::NOT_FOUND, "unknown transfer") };
    if t.kind != kind {
        return err(StatusCode::NOT_FOUND, "unknown transfer");
    }
    if decline {
        t.set_status(Status::Declined, None);
        node.finish(&t);
    } else if t.cancel() {
        if t.direction == Direction::In {
            node.inbox.discard_unstarted(&t);
        }
        node.finish(&t);
    }
    Json(json!({ "ok": true })).into_response()
}

// ----- native peers ----------------------------------------------------------------------------

async fn p_offer(State(node): S, ConnectInfo(remote): ConnectInfo<SocketAddr>, h: HeaderMap, body: Bytes) -> Response {
    let (Some(epk), Some(spk)) = (header_str(&h, "x-td-epk"), header_str(&h, "x-td-spk")) else {
        return err(StatusCode::BAD_REQUEST, "missing keys");
    };
    let (Ok(epk_k), Ok(spk_k)) = (crypto::public_from_b64(epk), crypto::public_from_b64(spk)) else {
        return err(StatusCode::BAD_REQUEST, "bad keys");
    };
    let key = crypto::peer_key_receiver(&node.identity, &epk_k, &spk_k);
    let mut offer: Offer = match crypto::open_json(&key, "offer", &body) {
        Ok(v) => v,
        Err(_) => return err(StatusCode::BAD_REQUEST, "bad offer"),
    };
    // The sender's long-term key is what the session key proves; never trust a different claim.
    offer.sender.public_key = Some(spk.to_string());
    let (trusted, key_changed) = node.trust_state(&offer.sender.id, spk);
    let verification = crypto::verification_code(node.identity.public.as_bytes(), spk_k.as_bytes());
    let ask = key_changed || (node.settings().require_approval && !trusted);
    tracing::info!("offer from {} ({remote}), trusted={trusted}", offer.sender.name);
    let platform = offer.sender.platform.clone();
    let reply = receive_offer(&node, key.clone(), offer, PeerKind::Device, platform, Some(verification), ask).await;
    sealed(crypto::seal_json(&key, "offer-reply", &reply))
}

// ----- web client ------------------------------------------------------------------------------

async fn static_file(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };
    let (file, name) = match WebAssets::get(path) {
        Some(f) => (f, path.to_string()),
        None if !path.starts_with("api/") && !path.contains('.') => match WebAssets::get("index.html") {
            Some(f) => (f, "index.html".to_string()),
            None => return err(StatusCode::NOT_FOUND, "not found"),
        },
        None => return err(StatusCode::NOT_FOUND, "not found"),
    };
    let mime = mime_guess::from_path(&name).first_or_octet_stream();
    let mut r = (StatusCode::OK, file.data.into_owned()).into_response();
    let hd = r.headers_mut();
    hd.insert(header::CONTENT_TYPE, HeaderValue::from_str(mime.as_ref()).unwrap_or(HeaderValue::from_static("application/octet-stream")));
    hd.insert("x-content-type-options", HeaderValue::from_static("nosniff"));
    hd.insert("referrer-policy", HeaderValue::from_static("no-referrer"));
    if name == "index.html" {
        hd.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
        hd.insert(
            "content-security-policy",
            HeaderValue::from_static(
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; \
                 media-src 'self' blob:; connect-src 'self' ws: wss:; font-src 'self' data:; object-src 'none'; \
                 base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
            ),
        );
        hd.insert("x-frame-options", HeaderValue::from_static("DENY"));
    } else if name.starts_with("assets/") {
        hd.insert(header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=31536000, immutable"));
    }
    r
}
