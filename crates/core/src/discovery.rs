//! LAN discovery over UDP multicast (239.255.74.74). Every node announces itself on start and
//! every 10 seconds, answers announces it hears, and forgets peers silent for 35 seconds.

use std::net::{IpAddr, Ipv4Addr, SocketAddr, SocketAddrV4};
use std::sync::Arc;
use std::time::Duration;

use socket2::{Domain, Protocol, Socket, Type};
use tokio::net::UdpSocket;

use crate::events::{now_ms, Event};
use crate::node::Node;
use crate::protocol::{Announce, MULTICAST_ADDR, PROTOCOL};

const ANNOUNCE_EVERY: Duration = Duration::from_secs(10);
const FORGET_AFTER_MS: i64 = 35_000;

fn group() -> Ipv4Addr {
    Ipv4Addr::from(MULTICAST_ADDR)
}

fn local_v4() -> Vec<Ipv4Addr> {
    if_addrs::get_if_addrs()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|i| match i.ip() {
            IpAddr::V4(ip) if !ip.is_loopback() => Some(ip),
            _ => None,
        })
        .collect()
}

fn open_socket(port: u16) -> std::io::Result<UdpSocket> {
    let s = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP))?;
    s.set_reuse_address(true)?;
    #[cfg(all(unix, not(any(target_os = "solaris", target_os = "illumos"))))]
    s.set_reuse_port(true)?;
    s.set_nonblocking(true)?;
    s.bind(&SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, port)).into())?;
    s.set_multicast_loop_v4(true)?;
    s.set_multicast_ttl_v4(1)?;
    let _ = s.join_multicast_v4(&group(), &Ipv4Addr::UNSPECIFIED);
    for ip in local_v4() {
        let _ = s.join_multicast_v4(&group(), &ip);
    }
    UdpSocket::from_std(s.into())
}

/// Send an announce on every interface (multicast picks one interface per send otherwise).
async fn announce(node: &Node, sock: &UdpSocket, reply: bool) {
    let packet = Announce { proto: PROTOCOL.to_string(), device: node.info(), reply };
    let Ok(bytes) = serde_json::to_vec(&packet) else { return };
    let dest = SocketAddr::V4(SocketAddrV4::new(group(), node.discovery_port));
    let sref = socket2::SockRef::from(sock);
    let ifaces = local_v4();
    if ifaces.is_empty() {
        let _ = sock.send_to(&bytes, dest).await;
        return;
    }
    for ip in ifaces {
        if sref.set_multicast_if_v4(&ip).is_ok() {
            let _ = sock.send_to(&bytes, dest).await;
        }
    }
    // Loopback copy so two nodes on one machine (tests, dev) find each other.
    if sref.set_multicast_if_v4(&Ipv4Addr::LOCALHOST).is_ok() {
        let _ = sock.send_to(&bytes, dest).await;
    }
}

pub fn spawn(node: Arc<Node>) {
    tokio::spawn(async move {
        let sock = match open_socket(node.discovery_port) {
            Ok(s) => s,
            Err(e) => {
                tracing::warn!("discovery disabled: {e}");
                return;
            }
        };
        announce(&node, &sock, false).await;
        let mut tick = tokio::time::interval(ANNOUNCE_EVERY);
        tick.tick().await;
        let mut buf = vec![0u8; 8192];
        loop {
            tokio::select! {
                r = sock.recv_from(&mut buf) => {
                    let Ok((n, from)) = r else { continue };
                    let Ok(a) = serde_json::from_slice::<Announce>(&buf[..n]) else { continue };
                    if a.proto != PROTOCOL || a.device.id == node.device_id {
                        continue;
                    }
                    let addr = match from.ip() {
                        IpAddr::V4(ip) => ip.to_string(),
                        IpAddr::V6(ip) => ip.to_string(),
                    };
                    let known = node.peers.lock().unwrap().contains_key(&a.device.id);
                    node.upsert_peer(a.device, addr, "lan");
                    if !a.reply || !known {
                        // Answer so the newcomer sees us right away instead of in 10 s.
                        if !a.reply {
                            announce(&node, &sock, true).await;
                        }
                    }
                }
                _ = tick.tick() => {
                    announce(&node, &sock, false).await;
                    let cutoff = now_ms() - FORGET_AFTER_MS;
                    let lost: Vec<String> = {
                        let mut peers = node.peers.lock().unwrap();
                        let lost: Vec<String> = peers
                            .values()
                            .filter(|p| p.source == "lan" && p.last_seen < cutoff)
                            .map(|p| p.device.id.clone())
                            .collect();
                        for id in &lost {
                            peers.remove(id);
                        }
                        lost
                    };
                    for id in lost {
                        node.emit(Event::PeerLost { id });
                    }
                }
            }
        }
    });
}
