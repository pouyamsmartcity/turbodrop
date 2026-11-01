//! Transfer state shared by every direction (in/out) and peer kind (device/browser), plus the
//! receiving side's chunk writer with resume support.

use std::collections::{HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tokio::io::{AsyncSeekExt, AsyncWriteExt};

use crate::crypto::Key;
use crate::events::{now_ms, Direction, FileStatus, FileView, PeerKind, Status, TransferView};
use crate::paths;
use crate::protocol::{FileDecision, FileMeta, FilePlan, CHUNK_SIZE};

/// Smoothed throughput over a sliding window.
#[derive(Debug, Default)]
pub struct SpeedMeter {
    samples: VecDeque<(Instant, u64)>,
}

impl SpeedMeter {
    pub fn record(&mut self, total: u64) {
        let now = Instant::now();
        self.samples.push_back((now, total));
        while let Some((t, _)) = self.samples.front() {
            if now.duration_since(*t) > Duration::from_secs(3) && self.samples.len() > 2 {
                self.samples.pop_front();
            } else {
                break;
            }
        }
    }

    pub fn speed(&self) -> f64 {
        match (self.samples.front(), self.samples.back()) {
            (Some((t0, b0)), Some((t1, b1))) if t1 > t0 => {
                (b1.saturating_sub(*b0)) as f64 / t1.duration_since(*t0).as_secs_f64()
            }
            _ => 0.0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct FileSlot {
    pub meta: FileMeta,
    /// Out: the source file. In: the final destination.
    pub local: PathBuf,
    pub next_index: u64,
    pub done_bytes: u64,
    pub status: FileStatus,
    pub resumed: bool,
    /// Identifies the same file across retries and app restarts (receiving side).
    pub resume_key: String,
}

impl FileSlot {
    pub fn view(&self) -> FileView {
        FileView {
            id: self.meta.id.clone(),
            name: self.meta.name.clone(),
            path: self.meta.path.clone(),
            size: self.meta.size,
            done_bytes: self.done_bytes,
            status: self.status,
            local_path: Some(self.local.to_string_lossy().into_owned()),
            resumed: self.resumed,
        }
    }
}

#[derive(Debug)]
pub struct TState {
    pub status: Status,
    pub files: Vec<FileSlot>,
    pub started_at: i64,
    pub finished_at: Option<i64>,
    pub error: Option<String>,
    pub meter: SpeedMeter,
    pub last_emit: Option<Instant>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    Accept,
    Decline,
}

pub struct Transfer {
    pub id: String,
    pub direction: Direction,
    pub kind: PeerKind,
    pub key: Key,
    pub peer_id: String,
    pub peer_name: String,
    pub peer_platform: String,
    pub text: Option<String>,
    pub verification: Option<String>,
    pub state: Mutex<TState>,
    canceled: AtomicBool,
    pub cancel_notify: tokio::sync::Notify,
    pub decision: Mutex<Option<tokio::sync::oneshot::Sender<Decision>>>,
    /// One writer per file at a time.
    file_locks: Vec<tokio::sync::Mutex<()>>,
}

pub struct TransferInit {
    pub id: String,
    pub direction: Direction,
    pub kind: PeerKind,
    pub key: Key,
    pub peer_id: String,
    pub peer_name: String,
    pub peer_platform: String,
    pub text: Option<String>,
    pub verification: Option<String>,
    pub files: Vec<FileSlot>,
    pub status: Status,
}

impl Transfer {
    pub fn new(init: TransferInit) -> Self {
        let n = init.files.len();
        Transfer {
            id: init.id,
            direction: init.direction,
            kind: init.kind,
            key: init.key,
            peer_id: init.peer_id,
            peer_name: init.peer_name,
            peer_platform: init.peer_platform,
            text: init.text,
            verification: init.verification,
            state: Mutex::new(TState {
                status: init.status,
                files: init.files,
                started_at: now_ms(),
                finished_at: None,
                error: None,
                meter: SpeedMeter::default(),
                last_emit: None,
            }),
            canceled: AtomicBool::new(false),
            cancel_notify: tokio::sync::Notify::new(),
            decision: Mutex::new(None),
            file_locks: (0..n).map(|_| tokio::sync::Mutex::new(())).collect(),
        }
    }

    pub fn view(&self) -> TransferView {
        let st = self.state.lock().unwrap();
        self.view_locked(&st)
    }

    pub fn view_locked(&self, st: &TState) -> TransferView {
        let files: Vec<FileView> = st.files.iter().map(FileSlot::view).collect();
        TransferView {
            id: self.id.clone(),
            direction: self.direction,
            kind: self.kind,
            peer_id: self.peer_id.clone(),
            peer_name: self.peer_name.clone(),
            peer_platform: self.peer_platform.clone(),
            status: st.status,
            total_bytes: st.files.iter().map(|f| f.meta.size).sum(),
            done_bytes: st.files.iter().map(|f| f.done_bytes).sum(),
            files,
            speed: if st.status == Status::Active { st.meter.speed() } else { 0.0 },
            started_at: st.started_at,
            finished_at: st.finished_at,
            text: self.text.clone(),
            error: st.error.clone(),
            verification: self.verification.clone(),
        }
    }

    pub fn status(&self) -> Status {
        self.state.lock().unwrap().status
    }

    pub fn is_canceled(&self) -> bool {
        self.canceled.load(Ordering::SeqCst)
    }

    /// Mark canceled. Returns false when the transfer had already finished.
    pub fn cancel(&self) -> bool {
        let mut st = self.state.lock().unwrap();
        if st.status.is_final() {
            return false;
        }
        st.status = Status::Canceled;
        st.finished_at = Some(now_ms());
        drop(st);
        self.canceled.store(true, Ordering::SeqCst);
        self.cancel_notify.notify_waiters();
        if let Some(tx) = self.decision.lock().unwrap().take() {
            let _ = tx.send(Decision::Decline);
        }
        true
    }

    pub fn set_status(&self, status: Status, error: Option<String>) {
        let mut st = self.state.lock().unwrap();
        if st.status.is_final() {
            return;
        }
        st.status = status;
        if status.is_final() {
            st.finished_at = Some(now_ms());
        }
        if error.is_some() {
            st.error = error;
        }
    }

    pub fn file_index(&self, file_id: &str) -> Option<usize> {
        self.state.lock().unwrap().files.iter().position(|f| f.meta.id == file_id)
    }

    /// Recompute the overall status after a file finished.
    pub fn settle(&self) -> bool {
        let mut st = self.state.lock().unwrap();
        if st.status.is_final() {
            return false;
        }
        let all_done = st.files.iter().all(|f| matches!(f.status, FileStatus::Done | FileStatus::Skipped));
        if all_done {
            st.status = Status::Done;
            st.finished_at = Some(now_ms());
            return true;
        }
        false
    }

    /// Record progress on a file; returns true when it is time to publish an update.
    pub fn progress(&self, idx: usize, next_index: u64, done_bytes: u64, file_done: bool) -> bool {
        let mut st = self.state.lock().unwrap();
        if st.status == Status::Waiting {
            st.status = Status::Active;
        }
        let f = &mut st.files[idx];
        f.next_index = next_index;
        f.done_bytes = done_bytes;
        f.status = if file_done { FileStatus::Done } else { FileStatus::Active };
        let total: u64 = st.files.iter().map(|f| f.done_bytes).sum();
        st.meter.record(total);
        let due = file_done || st.last_emit.map_or(true, |t| t.elapsed() >= Duration::from_millis(150));
        if due {
            st.last_emit = Some(Instant::now());
        }
        due
    }

    pub fn plans(&self) -> Vec<FilePlan> {
        let st = self.state.lock().unwrap();
        st.files
            .iter()
            .map(|f| FilePlan {
                id: f.meta.id.clone(),
                decision: if f.status == FileStatus::Skipped { FileDecision::Skip } else { FileDecision::Send },
                next_index: f.next_index,
            })
            .collect()
    }

    pub fn lock_for(&self, idx: usize) -> &tokio::sync::Mutex<()> {
        &self.file_locks[idx]
    }
}

/// What happened to a received chunk.
#[derive(Debug, PartialEq, Eq)]
pub enum ChunkOutcome {
    Stored,
    /// Already had it (a retry after a lost response).
    Duplicate,
    /// File finished and moved into place.
    Completed(PathBuf),
}

#[derive(Debug, thiserror::Error)]
pub enum ChunkError {
    #[error("unexpected chunk {got}, expected {expected}")]
    OutOfOrder { got: u64, expected: u64 },
    #[error("chunk has the wrong size")]
    BadSize,
    #[error("transfer is not active")]
    Inactive,
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}

/// A partially received file that can be continued later.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartialRecord {
    pub target: PathBuf,
    pub next_index: u64,
    pub size: u64,
    pub updated: i64,
}

/// The receiving folder and the record of partial files (persisted so resume survives restarts).
pub struct Inbox {
    dir: Mutex<PathBuf>,
    store: PathBuf,
    partials: Mutex<HashMap<String, PartialRecord>>,
}

impl Inbox {
    pub fn new(dir: PathBuf, data_dir: &Path) -> Self {
        let store = data_dir.join("partials.json");
        let partials = std::fs::read(&store)
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .unwrap_or_default();
        Inbox { dir: Mutex::new(dir), store, partials: Mutex::new(partials) }
    }

    pub fn dir(&self) -> PathBuf {
        self.dir.lock().unwrap().clone()
    }

    pub fn set_dir(&self, dir: PathBuf) {
        *self.dir.lock().unwrap() = dir;
    }

    pub fn resume_key(sender_id: &str, meta: &FileMeta) -> String {
        let mut h = blake3::Hasher::new();
        h.update(sender_id.as_bytes());
        h.update(b"\0");
        h.update(meta.path.as_bytes());
        h.update(b"\0");
        h.update(&meta.size.to_le_bytes());
        h.update(&meta.modified.unwrap_or(0).to_le_bytes());
        if let Some(hash) = &meta.hash {
            h.update(hash.as_bytes());
        }
        h.finalize().to_hex()[..32].to_string()
    }

    /// Decide where an offered file goes: resume a partial, skip an identical file, or start fresh.
    pub fn plan(&self, sender_id: &str, meta: &FileMeta) -> FileSlot {
        let key = Self::resume_key(sender_id, meta);
        let wanted = paths::resolve_under(&self.dir(), &meta.path);

        if let Some(rec) = self.partials.lock().unwrap().get(&key).cloned() {
            let part = paths::part_path(&rec.target);
            let expected = rec.next_index.saturating_mul(CHUNK_SIZE as u64).min(rec.size);
            if let Ok(md) = std::fs::metadata(&part) {
                if md.len() >= expected && rec.size == meta.size {
                    // Drop anything past the last confirmed chunk before continuing.
                    if md.len() > expected {
                        if let Ok(f) = std::fs::OpenOptions::new().write(true).open(&part) {
                            let _ = f.set_len(expected);
                        }
                    }
                    return FileSlot {
                        meta: meta.clone(),
                        local: rec.target.clone(),
                        next_index: rec.next_index,
                        done_bytes: expected,
                        status: FileStatus::Pending,
                        resumed: rec.next_index > 0,
                        resume_key: key,
                    };
                }
            }
        }

        if is_same_file(&wanted, meta) {
            return FileSlot {
                meta: meta.clone(),
                local: wanted,
                next_index: meta.chunk_count(),
                done_bytes: meta.size,
                status: FileStatus::Skipped,
                resumed: false,
                resume_key: key,
            };
        }

        FileSlot {
            meta: meta.clone(),
            local: paths::unique_path(&wanted),
            next_index: 0,
            done_bytes: 0,
            status: FileStatus::Pending,
            resumed: false,
            resume_key: key,
        }
    }

    fn remember(&self, key: &str, rec: PartialRecord) {
        let mut p = self.partials.lock().unwrap();
        p.insert(key.to_string(), rec);
        self.save_locked(&p);
    }

    fn forget(&self, key: &str) {
        let mut p = self.partials.lock().unwrap();
        if p.remove(key).is_some() {
            self.save_locked(&p);
        }
    }

    fn save_locked(&self, p: &HashMap<String, PartialRecord>) {
        // Keep the record small: drop partials untouched for 7 days.
        let cutoff = now_ms() - 7 * 24 * 3600 * 1000;
        let kept: HashMap<&String, &PartialRecord> = p.iter().filter(|(_, r)| r.updated > cutoff).collect();
        if let Some(parent) = self.store.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let tmp = self.store.with_extension("json.tmp");
        if std::fs::write(&tmp, serde_json::to_vec(&kept).unwrap_or_default()).is_ok() {
            let _ = std::fs::rename(&tmp, &self.store);
        }
    }

    /// Write one decrypted chunk. Chunks of a file arrive in order; a repeated chunk is ignored.
    pub async fn write_chunk(
        &self,
        transfer: &Transfer,
        idx: usize,
        index: u64,
        last: bool,
        data: &[u8],
    ) -> Result<ChunkOutcome, ChunkError> {
        let _guard = transfer.lock_for(idx).lock().await;
        if transfer.is_canceled() || transfer.status().is_final() {
            return Err(ChunkError::Inactive);
        }
        let slot = transfer.state.lock().unwrap().files[idx].clone();
        if matches!(slot.status, FileStatus::Done | FileStatus::Skipped) {
            return Ok(ChunkOutcome::Duplicate);
        }
        if index < slot.next_index {
            return Ok(ChunkOutcome::Duplicate);
        }
        if index > slot.next_index {
            return Err(ChunkError::OutOfOrder { got: index, expected: slot.next_index });
        }
        let chunks = slot.meta.chunk_count();
        let offset = index * CHUNK_SIZE as u64;
        let expected_len = (slot.meta.size - offset.min(slot.meta.size)).min(CHUNK_SIZE as u64);
        if last != (index + 1 == chunks) || data.len() as u64 != expected_len {
            return Err(ChunkError::BadSize);
        }

        let part = paths::part_path(&slot.local);
        if let Some(parent) = part.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        let mut f = tokio::fs::OpenOptions::new().create(true).write(true).truncate(false).open(&part).await?;
        f.set_len(offset).await?;
        f.seek(std::io::SeekFrom::Start(offset)).await?;
        f.write_all(data).await?;
        f.flush().await?;
        drop(f);

        let next = index + 1;
        let done_bytes = offset + data.len() as u64;
        if !last {
            self.remember(
                &slot.resume_key,
                PartialRecord { target: slot.local.clone(), next_index: next, size: slot.meta.size, updated: now_ms() },
            );
            transfer.progress(idx, next, done_bytes, false);
            return Ok(ChunkOutcome::Stored);
        }

        // Finished: move into place without overwriting anything that appeared meanwhile.
        let final_path = if slot.local.exists() { paths::unique_path(&slot.local) } else { slot.local.clone() };
        tokio::fs::rename(&part, &final_path).await?;
        if let Some(ms) = slot.meta.modified {
            set_mtime(&final_path, ms);
        }
        self.forget(&slot.resume_key);
        {
            let mut st = transfer.state.lock().unwrap();
            st.files[idx].local = final_path.clone();
        }
        transfer.progress(idx, next, done_bytes, true);
        Ok(ChunkOutcome::Completed(final_path))
    }

    /// Remove `.tdpart` files of a canceled transfer that never made progress worth keeping.
    pub fn discard_unstarted(&self, transfer: &Transfer) {
        let st = transfer.state.lock().unwrap();
        for f in &st.files {
            if f.next_index == 0 && f.status != FileStatus::Skipped {
                let _ = std::fs::remove_file(paths::part_path(&f.local));
            }
        }
    }
}

/// Same name, same size and same modification time (we restore the sender's mtime on every
/// received file, so a second send of an unchanged file matches).
fn is_same_file(path: &Path, meta: &FileMeta) -> bool {
    let Ok(md) = std::fs::metadata(path) else { return false };
    if !md.is_file() || md.len() != meta.size {
        return false;
    }
    let Some(want) = meta.modified else { return false };
    let Ok(m) = md.modified() else { return false };
    let have = m.duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(-1);
    // FAT/exFAT keep 2-second precision.
    (have - want).abs() <= 2000
}

fn set_mtime(path: &Path, ms: i64) {
    if ms <= 0 {
        return;
    }
    let t = std::time::UNIX_EPOCH + Duration::from_millis(ms as u64);
    if let Ok(f) = std::fs::OpenOptions::new().write(true).open(path) {
        let _ = f.set_modified(t);
    }
}

pub fn file_mtime_ms(md: &std::fs::Metadata) -> Option<i64> {
    md.modified().ok()?.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_millis() as i64)
}
