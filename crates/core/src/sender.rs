//! Sending side: collecting files, sending to native devices, and offering files to browsers.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{anyhow, bail, Context};
use futures_util::stream::{self, StreamExt};
use tokio::io::{AsyncReadExt, AsyncSeekExt};

use crate::crypto::{self, Key};
use crate::events::{Direction, FileStatus, Peer, PeerKind, Status};
use crate::node::Node;
use crate::protocol::{
    DeviceInfo, FileDecision, FileMeta, Offer, OfferReply, SenderInfo, CHUNK_SIZE,
};
use crate::transfer::{file_mtime_ms, FileSlot, Transfer, TransferInit};

const MAX_FILES: usize = 100_000;
/// Files uploaded at the same time to one device.
const PARALLEL_FILES: usize = 3;

/// Expand files and folders into a flat list. Folder contents keep their relative layout
/// (`Holiday/day1/a.jpg`). Symlinks are not followed.
pub fn collect_files(paths: &[PathBuf]) -> anyhow::Result<Vec<(PathBuf, FileMeta)>> {
    let mut out = Vec::new();
    for p in paths {
        let md =
            std::fs::symlink_metadata(p).with_context(|| format!("cannot read {}", p.display()))?;
        let name = p
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_else(|| "file".into());
        if md.is_dir() {
            walk(p, &name, &mut out)?;
        } else if md.is_file() {
            out.push((p.clone(), meta_for(&name, &name, &md, p)));
        } else if md.file_type().is_symlink() {
            if let Ok(t) = std::fs::metadata(p) {
                if t.is_file() {
                    out.push((p.clone(), meta_for(&name, &name, &t, p)));
                }
            }
        }
        if out.len() > MAX_FILES {
            bail!("too many files (more than {MAX_FILES})");
        }
    }
    Ok(out)
}

fn walk(dir: &Path, rel: &str, out: &mut Vec<(PathBuf, FileMeta)>) -> anyhow::Result<()> {
    let mut entries: Vec<_> = std::fs::read_dir(dir)?.filter_map(Result::ok).collect();
    entries.sort_by_key(|e| e.file_name());
    for e in entries {
        let Ok(ft) = e.file_type() else { continue };
        let name = e.file_name().to_string_lossy().into_owned();
        let child_rel = format!("{rel}/{name}");
        if ft.is_dir() {
            walk(&e.path(), &child_rel, out)?;
        } else if ft.is_file() {
            if let Ok(md) = e.metadata() {
                out.push((e.path(), meta_for(&name, &child_rel, &md, &e.path())));
            }
        }
        if out.len() > MAX_FILES {
            bail!("too many files (more than {MAX_FILES})");
        }
    }
    Ok(())
}

fn meta_for(name: &str, rel: &str, md: &std::fs::Metadata, path: &Path) -> FileMeta {
    FileMeta {
        id: crypto::random_id(9),
        name: name.to_string(),
        path: rel.to_string(),
        size: md.len(),
        mime: mime_guess::from_path(path)
            .first()
            .map(|m| m.essence_str().to_string()),
        modified: file_mtime_ms(md),
        hash: None,
    }
}

fn out_slots(files: Vec<(PathBuf, FileMeta)>) -> Vec<FileSlot> {
    files
        .into_iter()
        .map(|(local, meta)| FileSlot {
            meta,
            local,
            next_index: 0,
            done_bytes: 0,
            status: FileStatus::Pending,
            resumed: false,
            resume_key: String::new(),
        })
        .collect()
}

pub(crate) fn sender_info(node: &Node) -> SenderInfo {
    let me = node.info();
    SenderInfo {
        id: me.id,
        name: me.name,
        platform: me.platform,
        public_key: Some(me.public_key),
    }
}

/// Read chunk `index` of a file.
pub(crate) async fn read_chunk(path: &Path, size: u64, index: u64) -> std::io::Result<Vec<u8>> {
    let offset = index * CHUNK_SIZE as u64;
    let len = size.saturating_sub(offset).min(CHUNK_SIZE as u64) as usize;
    let mut f = tokio::fs::File::open(path).await?;
    f.seek(std::io::SeekFrom::Start(offset)).await?;
    let mut buf = vec![0u8; len];
    f.read_exact(&mut buf).await?;
    Ok(buf)
}

// ----- native devices ------------------------------------------------------------------------

pub async fn send_to_peer(
    node: Arc<Node>,
    peer: Peer,
    paths: &[PathBuf],
    text: Option<String>,
) -> anyhow::Result<String> {
    let files = collect_files(paths)?;
    if files.is_empty() && text.as_deref().map_or(true, str::is_empty) {
        bail!("nothing to send");
    }
    let receiver = crypto::public_from_b64(&peer.device.public_key)
        .map_err(|_| anyhow!("device has a bad key"))?;
    let (eph, key) = crypto::peer_key_sender(&node.identity, &receiver);
    let id = crypto::random_id(12);
    let t = Arc::new(Transfer::new(TransferInit {
        id: id.clone(),
        direction: Direction::Out,
        kind: PeerKind::Device,
        key,
        peer_id: peer.device.id.clone(),
        peer_name: peer.device.name.clone(),
        peer_platform: peer.device.platform.clone(),
        text,
        verification: Some(peer.verification.clone()),
        files: out_slots(files),
        status: Status::Waiting,
    }));
    node.add_transfer(t.clone());
    node.emit_transfer(&t);
    let base = format!("http://{}:{}", peer.address, peer.device.port);
    let epk = base64_url(eph.as_bytes());
    tokio::spawn(async move {
        let result = run_peer_send(&node, &t, &base, &epk).await;
        match result {
            Ok(()) => {
                t.settle();
            }
            Err(e) if t.is_canceled() => {
                tracing::debug!("send canceled: {e}");
            }
            Err(e) => {
                let declined = e.to_string() == "declined";
                if declined {
                    t.set_status(Status::Declined, None);
                } else {
                    t.set_status(Status::Failed, Some(e.to_string()));
                }
            }
        }
        node.finish(&t);
    });
    Ok(id)
}

fn base64_url(b: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(b)
}

async fn run_peer_send(
    node: &Arc<Node>,
    t: &Arc<Transfer>,
    base: &str,
    epk: &str,
) -> anyhow::Result<()> {
    let offer = Offer {
        transfer_id: t.id.clone(),
        sender: sender_info(node),
        files: t
            .state
            .lock()
            .unwrap()
            .files
            .iter()
            .map(|f| f.meta.clone())
            .collect(),
        text: t.text.clone(),
    };
    let body = crypto::seal_json(&t.key, "offer", &offer);
    let resp = tokio::select! {
        r = node.http
            .post(format!("{base}/api/v1/p/offer"))
            .header("x-td-epk", epk)
            .header("x-td-spk", node.identity.public_b64())
            .timeout(Duration::from_secs(150))
            .body(body)
            .send() => r.context("the device did not answer")?,
        _ = t.cancel_notify.notified() => bail!("canceled"),
    };
    if !resp.status().is_success() {
        bail!("the device refused the transfer ({})", resp.status());
    }
    let bytes = resp.bytes().await?;
    let reply: OfferReply =
        crypto::open_json(&t.key, "offer-reply", &bytes).context("bad reply")?;
    if !reply.accepted {
        bail!("declined");
    }
    {
        let mut st = t.state.lock().unwrap();
        st.status = Status::Active;
        for plan in &reply.files {
            if let Some(f) = st.files.iter_mut().find(|f| f.meta.id == plan.id) {
                match plan.decision {
                    FileDecision::Skip => {
                        f.status = FileStatus::Skipped;
                        f.done_bytes = f.meta.size;
                    }
                    FileDecision::Send => {
                        f.next_index = plan.next_index.min(f.meta.chunk_count());
                        f.done_bytes = (f.next_index * CHUNK_SIZE as u64).min(f.meta.size);
                        f.resumed = f.next_index > 0;
                    }
                }
            }
        }
    }
    node.emit_transfer(t);

    let count = t.state.lock().unwrap().files.len();
    let results: Vec<anyhow::Result<()>> = stream::iter(0..count)
        .map(|idx| upload_file(node, t, base, idx))
        .buffer_unordered(PARALLEL_FILES)
        .collect()
        .await;
    for r in results {
        r?;
    }
    if t.is_canceled() {
        bail!("canceled");
    }
    Ok(())
}

async fn upload_file(
    node: &Arc<Node>,
    t: &Arc<Transfer>,
    base: &str,
    idx: usize,
) -> anyhow::Result<()> {
    let slot = t.state.lock().unwrap().files[idx].clone();
    if slot.status == FileStatus::Skipped {
        return Ok(());
    }
    let chunks = slot.meta.chunk_count();
    let mut index = slot.next_index;
    let mut failing_since: Option<Instant> = None;
    while index < chunks {
        if t.is_canceled() {
            bail!("canceled");
        }
        let last = index + 1 == chunks;
        let data = read_chunk(&slot.local, slot.meta.size, index)
            .await
            .with_context(|| format!("cannot read {}", slot.local.display()))?;
        let len = data.len() as u64;
        let sealed = crypto::seal(
            &t.key,
            &crypto::chunk_aad(&t.id, &slot.meta.id, index, last),
            &data,
        );
        let url = format!(
            "{base}/api/v1/p/upload/{}/{}?i={index}&last={}",
            t.id, slot.meta.id, last as u8
        );
        let res = node
            .http
            .put(&url)
            .timeout(Duration::from_secs(60))
            .body(sealed)
            .send()
            .await;
        match res {
            Ok(r) if r.status().is_success() => {
                failing_since = None;
                index += 1;
                let done = (index - 1) * CHUNK_SIZE as u64 + len;
                if t.progress(idx, index, done, last) {
                    node.emit_transfer(t);
                }
            }
            Ok(r) if r.status() == reqwest::StatusCode::CONFLICT => {
                // Receiver tells us where it actually is (e.g. after its restart).
                let v: serde_json::Value = r.json().await.unwrap_or_default();
                index = v["next"].as_u64().unwrap_or(index).min(chunks);
            }
            Ok(r) if r.status() == reqwest::StatusCode::GONE => {
                t.cancel();
                bail!("canceled");
            }
            Ok(r) => bail!("the device rejected a chunk ({})", r.status()),
            Err(e) => {
                // Network hiccup: keep retrying for a while, then give up (a later send resumes).
                let since = *failing_since.get_or_insert_with(Instant::now);
                if since.elapsed() > Duration::from_secs(60) {
                    return Err(anyhow!("connection lost: {e}"));
                }
                tokio::time::sleep(Duration::from_millis(800)).await;
                if let Ok(r) = node
                    .http
                    .get(format!("{base}/api/v1/p/status/{}/{}", t.id, slot.meta.id))
                    .timeout(Duration::from_secs(5))
                    .send()
                    .await
                {
                    if let Ok(v) = r.json::<serde_json::Value>().await {
                        if let Some(n) = v["next"].as_u64() {
                            index = n.min(chunks);
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

// ----- browsers ------------------------------------------------------------------------------

pub(crate) fn browser_offer(me: &DeviceInfo, t: &Transfer) -> Offer {
    Offer {
        transfer_id: t.id.clone(),
        sender: SenderInfo {
            id: me.id.clone(),
            name: me.name.clone(),
            platform: me.platform.clone(),
            public_key: None,
        },
        files: t
            .state
            .lock()
            .unwrap()
            .files
            .iter()
            .map(|f| f.meta.clone())
            .collect(),
        text: t.text.clone(),
    }
}

pub async fn send_to_browsers(
    node: Arc<Node>,
    client_id: Option<&str>,
    paths: &[PathBuf],
    text: Option<String>,
) -> anyhow::Result<Vec<String>> {
    let files = collect_files(paths)?;
    if files.is_empty() && text.as_deref().map_or(true, str::is_empty) {
        bail!("nothing to send");
    }
    let targets: Vec<(String, String, String)> = {
        let clients = node.clients.lock().unwrap();
        clients
            .values()
            .filter(|c| match client_id {
                Some(id) => c.info.id == id,
                None => c.info.online,
            })
            .map(|c| {
                (
                    c.info.id.clone(),
                    c.info.name.clone(),
                    c.info.platform.clone(),
                )
            })
            .collect()
    };
    if targets.is_empty() {
        bail!("no phone is connected — scan the QR code first");
    }
    let key: Key = node.room.lock().unwrap().data.clone();
    let me = node.info();
    let mut ids = Vec::new();
    for (cid, cname, cplat) in targets {
        // Each phone gets its own transfer (own progress), with fresh file ids.
        let mut list = files.clone();
        for (_, m) in list.iter_mut() {
            m.id = crypto::random_id(9);
        }
        let only_text = list.is_empty();
        let t = Arc::new(Transfer::new(TransferInit {
            id: crypto::random_id(12),
            direction: Direction::Out,
            kind: PeerKind::Browser,
            key: key.clone(),
            peer_id: cid.clone(),
            peer_name: cname,
            peer_platform: cplat,
            text: text.clone(),
            verification: None,
            files: out_slots(list),
            status: Status::Waiting,
        }));
        node.add_transfer(t.clone());
        let offer = browser_offer(&me, &t);
        node.push_to_client(&cid, &serde_json::json!({"type": "offer", "offer": offer}));
        if only_text {
            t.set_status(Status::Done, None);
            node.finish(&t);
        } else {
            node.emit_transfer(&t);
        }
        ids.push(t.id.clone());
    }
    Ok(ids)
}
