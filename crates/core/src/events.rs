//! Events the engine publishes to front-ends (desktop app, CLI).

use serde::{Deserialize, Serialize};

use crate::protocol::{DeviceInfo, SenderInfo};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    In,
    Out,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PeerKind {
    /// Another Turbodrop app or CLI.
    Device,
    /// A phone/computer using the zero-install web client.
    Browser,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    /// Waiting for the other side (or the user) to accept.
    Waiting,
    Active,
    Done,
    Declined,
    Canceled,
    Failed,
}

impl Status {
    pub fn is_final(self) -> bool {
        matches!(
            self,
            Status::Done | Status::Declined | Status::Canceled | Status::Failed
        )
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FileStatus {
    Pending,
    Active,
    Done,
    Skipped,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileView {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub done_bytes: u64,
    pub status: FileStatus,
    /// Where the file is on this computer (received or being sent).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub local_path: Option<String>,
    /// True when this file continued an earlier, interrupted transfer.
    #[serde(default)]
    pub resumed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferView {
    pub id: String,
    pub direction: Direction,
    pub kind: PeerKind,
    pub peer_id: String,
    pub peer_name: String,
    pub peer_platform: String,
    pub status: Status,
    pub files: Vec<FileView>,
    pub total_bytes: u64,
    pub done_bytes: u64,
    /// Bytes per second, smoothed.
    pub speed: f64,
    pub started_at: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Emoji code to compare on both screens (native peers).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub verification: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Peer {
    pub device: DeviceInfo,
    pub address: String,
    pub last_seen: i64,
    /// "lan" (multicast discovery) or "manual" (added by address).
    pub source: String,
    pub trusted: bool,
    pub verification: String,
    /// Set when a trusted device id shows up with a different key.
    #[serde(default)]
    pub key_changed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserClient {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub online: bool,
    pub last_seen: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Event {
    PeerUpdate {
        peer: Peer,
    },
    PeerLost {
        id: String,
    },
    BrowserUpdate {
        client: BrowserClient,
    },
    /// An incoming transfer that waits for the user to accept or decline.
    IncomingRequest {
        transfer: TransferView,
    },
    TransferUpdate {
        transfer: TransferView,
    },
    TextReceived {
        transfer_id: String,
        from: SenderInfo,
        text: String,
    },
    /// The browser room key was rotated; old QR codes stop working.
    RoomRotated,
}

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
