//! Wire types. The full protocol is documented in docs/PROTOCOL.md.

use serde::{Deserialize, Serialize};

pub const PROTOCOL: &str = "turbodrop/1";
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
/// Plaintext bytes per chunk. Offsets are always `index * CHUNK_SIZE`, which makes resume trivial.
pub const CHUNK_SIZE: usize = 4 * 1024 * 1024;
pub const DEFAULT_PORT: u16 = 47474;
pub const MULTICAST_ADDR: [u8; 4] = [239, 255, 74, 74];

/// Public description of a device. Safe to show to anyone on the network.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub version: String,
    pub port: u16,
    /// X25519 public key, base64url.
    pub public_key: String,
    pub fingerprint: String,
}

/// Multicast discovery packet.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Announce {
    pub proto: String,
    pub device: DeviceInfo,
    /// True when answering someone else's announce (receivers must not answer a reply).
    #[serde(default)]
    pub reply: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FileMeta {
    pub id: String,
    /// Base name.
    pub name: String,
    /// Relative path with `/` separators, including the name (folders are kept).
    pub path: String,
    pub size: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime: Option<String>,
    /// Last-modified time, unix milliseconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modified: Option<i64>,
    /// BLAKE3 hex of the content, when the sender could afford computing it (native senders).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hash: Option<String>,
}

impl FileMeta {
    pub fn chunk_count(&self) -> u64 {
        chunk_count(self.size)
    }
}

/// Number of chunks for a file. An empty file still has one (empty) chunk so it gets a `last` flag.
pub fn chunk_count(size: u64) -> u64 {
    if size == 0 {
        1
    } else {
        size.div_ceil(CHUNK_SIZE as u64)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SenderInfo {
    pub id: String,
    pub name: String,
    pub platform: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub public_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Offer {
    pub transfer_id: String,
    pub sender: SenderInfo,
    #[serde(default)]
    pub files: Vec<FileMeta>,
    /// A text message / link / clipboard content sent alongside or instead of files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

impl Offer {
    pub fn total_bytes(&self) -> u64 {
        self.files.iter().map(|f| f.size).sum()
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FileDecision {
    /// Send from `next_index`.
    Send,
    /// Receiver already has an identical file.
    Skip,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FilePlan {
    pub id: String,
    pub decision: FileDecision,
    /// First chunk the receiver still needs (non-zero when resuming).
    pub next_index: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OfferReply {
    pub accepted: bool,
    #[serde(default)]
    pub files: Vec<FilePlan>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// Browser → host greeting, sealed with the session data key.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Hello {
    pub client_id: String,
    pub name: String,
    #[serde(default)]
    pub platform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Welcome {
    pub host: DeviceInfo,
    pub chunk_size: usize,
    /// Transfers waiting for this browser (host → phone), so a reloaded page picks them up again.
    pub pending: Vec<Offer>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chunk_counts() {
        let c = CHUNK_SIZE as u64;
        assert_eq!(chunk_count(0), 1);
        assert_eq!(chunk_count(1), 1);
        assert_eq!(chunk_count(c), 1);
        assert_eq!(chunk_count(c + 1), 2);
        assert_eq!(chunk_count(10 * c), 10);
    }

    #[test]
    fn offer_json_shape_is_camel_case() {
        let o = Offer {
            transfer_id: "t".into(),
            sender: SenderInfo { id: "s".into(), name: "n".into(), platform: "ios".into(), public_key: None },
            files: vec![FileMeta {
                id: "f".into(),
                name: "a.txt".into(),
                path: "dir/a.txt".into(),
                size: 3,
                mime: None,
                modified: Some(1),
                hash: None,
            }],
            text: None,
        };
        let j = serde_json::to_string(&o).unwrap();
        assert!(j.contains("\"transferId\""));
        assert!(!j.contains("hash"));
        let back: Offer = serde_json::from_str(&j).unwrap();
        assert_eq!(back.total_bytes(), 3);
    }
}
