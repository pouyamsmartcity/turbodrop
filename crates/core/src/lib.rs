//! # Turbodrop core
//!
//! The engine behind the Turbodrop desktop app and CLI: LAN discovery, end-to-end encrypted,
//! resumable file transfer between devices, and a built-in web client so phones can send and
//! receive files from the browser after scanning a QR code — nothing to install.
//!
//! Made by [Pouyam](https://www.pouyam.com).

pub mod crypto;
pub mod discovery;
pub mod events;
pub mod node;
pub mod paths;
pub mod protocol;
pub mod sender;
pub mod server;
pub mod transfer;

pub use events::{BrowserClient, Direction, Event, FileStatus, FileView, Peer, PeerKind, Status, TransferView};
pub use node::{default_data_dir, default_download_dir, Config, Invite, InviteUrl, Node, Settings, TrustedDevice};
pub use protocol::{DeviceInfo, DEFAULT_PORT, VERSION};
