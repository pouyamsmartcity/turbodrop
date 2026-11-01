//! End-to-end tests: real nodes, real HTTP, real files on disk.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use turbodrop_core::crypto::{self, Key};
use turbodrop_core::protocol::{
    FileDecision, FileMeta, Hello, Offer, OfferReply, SenderInfo, Welcome, CHUNK_SIZE,
};
use turbodrop_core::{Config, Direction, Event, Node, Status, TransferView};

struct TestNode {
    node: Arc<Node>,
    _data: tempfile::TempDir,
    downloads: tempfile::TempDir,
}

async fn node_with(name: &str, require_approval: bool, discovery_port: u16) -> TestNode {
    let data = tempfile::tempdir().unwrap();
    let downloads = tempfile::tempdir().unwrap();
    let mut cfg = Config::new(data.path(), downloads.path());
    cfg.settings.device_name = name.into();
    cfg.settings.require_approval = require_approval;
    cfg.port = 0;
    cfg.discovery_port = discovery_port;
    let node = Node::start(cfg).await.unwrap();
    TestNode {
        node,
        _data: data,
        downloads,
    }
}

async fn node(name: &str, require_approval: bool) -> TestNode {
    node_with(name, require_approval, 0).await
}

fn pattern(len: usize, seed: u8) -> Vec<u8> {
    (0..len)
        .map(|i| ((i as u32).wrapping_mul(2654435761) >> 13) as u8 ^ seed)
        .collect()
}

/// Wait for a transfer to reach a final state.
async fn wait_final(node: &Node, tid: &str) -> TransferView {
    for _ in 0..400 {
        if let Some(v) = node.transfers().into_iter().find(|t| t.id == tid) {
            if v.status.is_final() {
                return v;
            }
        }
        tokio::time::sleep(Duration::from_millis(25)).await;
    }
    panic!("transfer {tid} did not finish");
}

async fn wait_incoming(node: &Node) -> TransferView {
    for _ in 0..400 {
        if let Some(v) = node
            .transfers()
            .into_iter()
            .find(|t| t.direction == Direction::In && t.status.is_final())
        {
            return v;
        }
        tokio::time::sleep(Duration::from_millis(25)).await;
    }
    panic!("nothing received");
}

fn local(addr: &Node) -> String {
    format!("127.0.0.1:{}", addr.port())
}

#[tokio::test]
async fn sends_folder_between_devices() {
    let a = node("Alice-PC", true).await;
    let b = node("Bob-PC", false).await;

    let src = tempfile::tempdir().unwrap();
    let album = src.path().join("سفر شمال");
    std::fs::create_dir_all(album.join("روز ۱")).unwrap();
    let big = pattern(CHUNK_SIZE * 2 + 12345, 1);
    std::fs::write(album.join("روز ۱").join("video.mp4"), &big).unwrap();
    std::fs::write(album.join("notes.txt"), "سلام از Turbodrop").unwrap();
    std::fs::write(album.join("empty.bin"), b"").unwrap();
    let single = src.path().join("report.pdf");
    std::fs::write(&single, pattern(CHUNK_SIZE, 7)).unwrap();

    let peer = a.node.add_peer(&local(&b.node)).await.unwrap();
    assert_eq!(peer.device.name, "Bob-PC");
    let tid = a
        .node
        .send_to_peer(&peer.device.id, &[album.clone(), single.clone()], None)
        .await
        .unwrap();
    let out = wait_final(&a.node, &tid).await;
    assert_eq!(out.status, Status::Done, "{:?}", out.error);
    assert_eq!(out.files.len(), 4);

    let got = b.downloads.path();
    assert_eq!(
        std::fs::read(got.join("سفر شمال").join("روز ۱").join("video.mp4")).unwrap(),
        big
    );
    assert_eq!(
        std::fs::read_to_string(got.join("سفر شمال").join("notes.txt")).unwrap(),
        "سلام از Turbodrop"
    );
    assert_eq!(
        std::fs::read(got.join("سفر شمال").join("empty.bin"))
            .unwrap()
            .len(),
        0
    );
    assert_eq!(
        std::fs::read(got.join("report.pdf")).unwrap(),
        pattern(CHUNK_SIZE, 7)
    );
    // No leftovers.
    let leftovers: Vec<_> = walk(got)
        .into_iter()
        .filter(|p| p.to_string_lossy().ends_with(".tdpart"))
        .collect();
    assert!(leftovers.is_empty(), "{leftovers:?}");

    // Receiver kept the sender's modification time, so sending again skips everything.
    let tid2 = a
        .node
        .send_to_peer(&peer.device.id, std::slice::from_ref(&single), None)
        .await
        .unwrap();
    let out2 = wait_final(&a.node, &tid2).await;
    assert_eq!(out2.status, Status::Done);
    assert_eq!(out2.files[0].status, turbodrop_core::FileStatus::Skipped);
    assert!(!got.join("report (2).pdf").exists());

    // A changed file with the same name is saved next to the old one.
    std::fs::write(&single, b"new version").unwrap();
    let tid3 = a
        .node
        .send_to_peer(&peer.device.id, &[single], None)
        .await
        .unwrap();
    assert_eq!(wait_final(&a.node, &tid3).await.status, Status::Done);
    assert_eq!(
        std::fs::read(got.join("report (2).pdf")).unwrap(),
        b"new version"
    );
}

fn walk(p: &Path) -> Vec<PathBuf> {
    let mut v = Vec::new();
    for e in std::fs::read_dir(p).unwrap().flatten() {
        if e.path().is_dir() {
            v.extend(walk(&e.path()));
        } else {
            v.push(e.path());
        }
    }
    v
}

#[tokio::test]
async fn unknown_device_needs_approval_then_trust_skips_prompt() {
    let a = node("Sender", false).await;
    let b = node("Receiver", true).await;
    let mut events = b.node.subscribe();
    let src = tempfile::tempdir().unwrap();
    let f = src.path().join("a.txt");
    std::fs::write(&f, "hi").unwrap();
    let peer = a.node.add_peer(&local(&b.node)).await.unwrap();

    let tid = a
        .node
        .send_to_peer(&peer.device.id, std::slice::from_ref(&f), None)
        .await
        .unwrap();
    let req = loop {
        if let Ok(Event::IncomingRequest { transfer }) = events.recv().await {
            break transfer;
        }
    };
    assert_eq!(req.peer_name, "Sender");
    // Both sides compute the same emoji code.
    assert_eq!(
        req.verification.as_deref(),
        Some(peer.verification.as_str())
    );
    b.node.respond(&req.id, true, true).unwrap();
    assert_eq!(wait_final(&a.node, &tid).await.status, Status::Done);

    // Trusted now: the next send goes straight through.
    std::fs::write(&f, "hi again").unwrap();
    let tid2 = a
        .node
        .send_to_peer(&peer.device.id, &[f], None)
        .await
        .unwrap();
    assert_eq!(wait_final(&a.node, &tid2).await.status, Status::Done);
}

#[tokio::test]
async fn declined_transfer_reports_declined() {
    let a = node("Sender", false).await;
    let b = node("Receiver", true).await;
    let mut events = b.node.subscribe();
    let src = tempfile::tempdir().unwrap();
    let f = src.path().join("a.txt");
    std::fs::write(&f, "nope").unwrap();
    let peer = a.node.add_peer(&local(&b.node)).await.unwrap();
    let tid = a
        .node
        .send_to_peer(&peer.device.id, &[f], None)
        .await
        .unwrap();
    loop {
        if let Ok(Event::IncomingRequest { transfer }) = events.recv().await {
            b.node.respond(&transfer.id, false, false).unwrap();
            break;
        }
    }
    assert_eq!(wait_final(&a.node, &tid).await.status, Status::Declined);
    assert!(walk(b.downloads.path()).is_empty());
}

#[tokio::test]
async fn text_message_between_devices() {
    let a = node("Sender", false).await;
    let b = node("Receiver", false).await;
    let mut events = b.node.subscribe();
    let peer = a.node.add_peer(&local(&b.node)).await.unwrap();
    let tid = a
        .node
        .send_to_peer(
            &peer.device.id,
            &[],
            Some("https://www.pouyam.com 🚀".into()),
        )
        .await
        .unwrap();
    let text = loop {
        if let Ok(Event::TextReceived { text, .. }) = events.recv().await {
            break text;
        }
    };
    assert_eq!(text, "https://www.pouyam.com 🚀");
    assert_eq!(wait_final(&a.node, &tid).await.status, Status::Done);
}

// ----- browser protocol, driven over plain HTTP like the web client does ----------------------

struct Phone {
    http: reqwest::Client,
    base: String,
    sid: String,
    token: String,
    data: Key,
    id: String,
}

impl Phone {
    fn from_invite(node: &Node, id: &str) -> Phone {
        let inv = node.invite();
        // The QR code is http://<lan-ip>:<port>/#<sid>.<key>; tests talk to loopback instead.
        let frag = inv
            .urls
            .first()
            .map(|u| u.url.split('#').nth(1).unwrap().to_string())
            .unwrap_or_else(|| invite_fragment_fallback(node));
        let (sid, key) = frag.split_once('.').unwrap();
        let root = Key::from_b64(key).unwrap();
        Phone {
            http: reqwest::Client::new(),
            base: format!("http://127.0.0.1:{}", node.port()),
            sid: sid.into(),
            token: crypto::auth_token(&root),
            data: root.derive(crypto::LABEL_DATA),
            id: id.into(),
        }
    }

    fn req(&self, m: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        self.http
            .request(m, format!("{}{}", self.base, path))
            .header("x-td-sid", &self.sid)
            .header("x-td-auth", &self.token)
    }

    async fn hello(&self) -> Welcome {
        let body = crypto::seal_json(
            &self.data,
            "hello",
            &Hello {
                client_id: self.id.clone(),
                name: "iPhone".into(),
                platform: "ios".into(),
            },
        );
        let r = self
            .req(reqwest::Method::POST, "/api/v1/b/hello")
            .body(body)
            .send()
            .await
            .unwrap();
        assert!(r.status().is_success(), "{}", r.status());
        crypto::open_json(&self.data, "welcome", &r.bytes().await.unwrap()).unwrap()
    }

    async fn offer(&self, tid: &str, files: Vec<FileMeta>, text: Option<String>) -> OfferReply {
        let offer = Offer {
            transfer_id: tid.into(),
            sender: SenderInfo {
                id: self.id.clone(),
                name: "iPhone".into(),
                platform: "ios".into(),
                public_key: None,
            },
            files,
            text,
        };
        let r = self
            .req(reqwest::Method::POST, "/api/v1/b/offer")
            .body(crypto::seal_json(&self.data, "offer", &offer))
            .send()
            .await
            .unwrap();
        crypto::open_json(&self.data, "offer-reply", &r.bytes().await.unwrap()).unwrap()
    }

    async fn upload(
        &self,
        tid: &str,
        fid: &str,
        i: u64,
        last: bool,
        data: &[u8],
    ) -> reqwest::StatusCode {
        let sealed = crypto::seal(&self.data, &crypto::chunk_aad(tid, fid, i, last), data);
        self.req(
            reqwest::Method::PUT,
            &format!("/api/v1/b/upload/{tid}/{fid}?i={i}&last={}", last as u8),
        )
        .body(sealed)
        .send()
        .await
        .unwrap()
        .status()
    }
}

fn invite_fragment_fallback(node: &Node) -> String {
    // CI machines without a private LAN address: read the room straight from the data dir.
    let v: serde_json::Value =
        serde_json::from_slice(&std::fs::read(node.data_dir.join("room.json")).unwrap()).unwrap();
    format!(
        "{}.{}",
        v["sid"].as_str().unwrap(),
        v["key"].as_str().unwrap()
    )
}

fn meta(id: &str, path: &str, size: usize, modified: i64) -> FileMeta {
    FileMeta {
        id: id.into(),
        name: path.rsplit('/').next().unwrap().into(),
        path: path.into(),
        size: size as u64,
        mime: None,
        modified: Some(modified),
        hash: None,
    }
}

fn chunks(data: &[u8]) -> Vec<&[u8]> {
    if data.is_empty() {
        vec![&data[..0]]
    } else {
        data.chunks(CHUNK_SIZE).collect()
    }
}

#[tokio::test]
async fn phone_uploads_and_resumes_after_drop_and_restart() {
    let data_dir = tempfile::tempdir().unwrap();
    let downloads = tempfile::tempdir().unwrap();
    let start = |port: u16| {
        let mut cfg = Config::new(data_dir.path(), downloads.path());
        cfg.port = port;
        cfg.discovery_port = 0;
        Node::start(cfg)
    };
    let pc = start(0).await.unwrap();
    let phone = Phone::from_invite(&pc, "phone-1");
    let w = phone.hello().await;
    assert_eq!(w.chunk_size, CHUNK_SIZE);

    let video = pattern(CHUNK_SIZE * 3 + 99, 3);
    let m = meta("f1", "IMG_0001.MOV", video.len(), 1_700_000_000_000);
    let reply = phone.offer("t1", vec![m.clone()], None).await;
    assert!(reply.accepted);
    assert_eq!(reply.files[0].next_index, 0);
    let parts = chunks(&video);
    assert!(phone
        .upload("t1", "f1", 0, false, parts[0])
        .await
        .is_success());
    assert!(phone
        .upload("t1", "f1", 1, false, parts[1])
        .await
        .is_success());
    // A retried chunk is harmless; a skipped-ahead chunk is refused with the real position.
    assert!(phone
        .upload("t1", "f1", 1, false, parts[1])
        .await
        .is_success());
    assert_eq!(
        phone.upload("t1", "f1", 3, true, parts[3]).await,
        reqwest::StatusCode::CONFLICT
    );

    // Wi-Fi drops, the page reloads, even the PC app restarts: the phone offers the file again.
    let pc2 = start(0).await.unwrap();
    let phone2 = Phone {
        base: format!("http://127.0.0.1:{}", pc2.port()),
        ..Phone::from_invite(&pc2, "phone-1")
    };
    phone2.hello().await;
    let reply = phone2.offer("t2", vec![m.clone()], None).await;
    assert!(reply.accepted);
    assert_eq!(reply.files[0].decision, FileDecision::Send);
    assert_eq!(
        reply.files[0].next_index, 2,
        "resumes after the two stored chunks"
    );
    assert!(phone2
        .upload("t2", "f1", 2, false, parts[2])
        .await
        .is_success());
    assert!(phone2
        .upload("t2", "f1", 3, true, parts[3])
        .await
        .is_success());
    let v = wait_final(&pc2, "t2").await;
    assert_eq!(v.status, Status::Done);
    assert!(v.files[0].resumed);
    assert_eq!(
        std::fs::read(downloads.path().join("IMG_0001.MOV")).unwrap(),
        video
    );
    // mtime restored → offering it once more is a skip.
    let again = phone2.offer("t3", vec![m], None).await;
    assert_eq!(again.files[0].decision, FileDecision::Skip);
}

#[tokio::test]
async fn phone_cannot_escape_download_folder_or_forge_chunks() {
    let pc = node("PC", true).await;
    let phone = Phone::from_invite(&pc.node, "phone-x");
    phone.hello().await;
    let reply = phone
        .offer(
            "tx",
            vec![
                meta("f", "../../../evil.txt", 4, 1),
                meta("g", "C:\\Windows\\win.ini", 2, 1),
            ],
            None,
        )
        .await;
    assert!(reply.accepted, "QR-joined phones do not need approval");
    assert!(phone.upload("tx", "f", 0, true, b"evil").await.is_success());
    assert!(phone.upload("tx", "g", 0, true, b"ok").await.is_success());
    wait_final(&pc.node, "tx").await;
    assert_eq!(
        std::fs::read(pc.downloads.path().join("evil.txt")).unwrap(),
        b"evil"
    );
    assert!(pc
        .downloads
        .path()
        .join("C_")
        .join("Windows")
        .join("win.ini")
        .exists());

    // Wrong credentials.
    let bad = Phone {
        token: "AAAA".into(),
        ..Phone::from_invite(&pc.node, "phone-x")
    };
    let r = bad
        .req(reqwest::Method::POST, "/api/v1/b/hello")
        .body(vec![1, 2, 3])
        .send()
        .await
        .unwrap();
    assert_eq!(r.status(), reqwest::StatusCode::UNAUTHORIZED);

    // A chunk sealed with another key, or for another position, is rejected.
    phone
        .offer("ty", vec![meta("h", "h.bin", 3, 1)], None)
        .await;
    let forged = crypto::seal(
        &Key::random(),
        &crypto::chunk_aad("ty", "h", 0, true),
        b"abc",
    );
    let r = phone
        .req(reqwest::Method::PUT, "/api/v1/b/upload/ty/h?i=0&last=1")
        .body(forged)
        .send()
        .await
        .unwrap();
    assert_eq!(r.status(), reqwest::StatusCode::BAD_REQUEST);
    let moved = crypto::seal(&phone.data, &crypto::chunk_aad("ty", "h", 1, true), b"abc");
    let r = phone
        .req(reqwest::Method::PUT, "/api/v1/b/upload/ty/h?i=0&last=1")
        .body(moved)
        .send()
        .await
        .unwrap();
    assert_eq!(r.status(), reqwest::StatusCode::BAD_REQUEST);
    // Wrong length for the declared size.
    assert_eq!(
        phone.upload("ty", "h", 0, true, b"abcd").await,
        reqwest::StatusCode::BAD_REQUEST
    );
    assert!(phone.upload("ty", "h", 0, true, b"abc").await.is_success());
}

#[tokio::test]
async fn pc_sends_to_phone_and_phone_downloads() {
    let pc = node("PC", true).await;
    let phone = Phone::from_invite(&pc.node, "phone-2");
    phone.hello().await;

    let src = tempfile::tempdir().unwrap();
    let photo = pattern(CHUNK_SIZE + 500, 9);
    std::fs::write(src.path().join("photo.jpg"), &photo).unwrap();
    let ids = pc
        .node
        .send_to_browser(
            Some("phone-2"),
            &[src.path().join("photo.jpg")],
            Some("for you".into()),
        )
        .await
        .unwrap();
    assert_eq!(ids.len(), 1);

    // The phone (e.g. after a reload) finds the pending offer in its welcome.
    let w = phone.hello().await;
    assert_eq!(w.pending.len(), 1);
    let offer = &w.pending[0];
    assert_eq!(offer.text.as_deref(), Some("for you"));
    let f = &offer.files[0];
    assert_eq!(f.name, "photo.jpg");
    let n = f.size.div_ceil(CHUNK_SIZE as u64);
    let mut got = Vec::new();
    for i in 0..n {
        let r = phone
            .req(
                reqwest::Method::GET,
                &format!("/api/v1/b/download/{}/{}?i={i}", offer.transfer_id, f.id),
            )
            .send()
            .await
            .unwrap();
        assert!(r.status().is_success());
        let plain = crypto::open(
            &phone.data,
            &crypto::chunk_aad(&offer.transfer_id, &f.id, i, i + 1 == n),
            &r.bytes().await.unwrap(),
        )
        .unwrap();
        got.extend(plain);
    }
    assert_eq!(got, photo);
    phone
        .req(
            reqwest::Method::POST,
            &format!("/api/v1/b/done/{}/{}", offer.transfer_id, f.id),
        )
        .send()
        .await
        .unwrap();
    assert_eq!(
        wait_final(&pc.node, &offer.transfer_id).await.status,
        Status::Done
    );
}

#[tokio::test]
async fn phone_can_decline_and_pc_can_cancel() {
    let pc = node("PC", true).await;
    let phone = Phone::from_invite(&pc.node, "phone-3");
    phone.hello().await;
    let src = tempfile::tempdir().unwrap();
    std::fs::write(src.path().join("a.bin"), b"abc").unwrap();
    let ids = pc
        .node
        .send_to_browser(Some("phone-3"), &[src.path().join("a.bin")], None)
        .await
        .unwrap();
    phone
        .req(
            reqwest::Method::POST,
            &format!("/api/v1/b/cancel/{}?decline=1", ids[0]),
        )
        .send()
        .await
        .unwrap();
    assert_eq!(wait_final(&pc.node, &ids[0]).await.status, Status::Declined);

    // Phone → PC upload canceled on the PC: further chunks get 410 Gone.
    phone
        .offer("tc", vec![meta("f", "big.bin", CHUNK_SIZE * 2, 1)], None)
        .await;
    assert!(phone
        .upload("tc", "f", 0, false, &pattern(CHUNK_SIZE, 1))
        .await
        .is_success());
    pc.node.cancel("tc").unwrap();
    assert_eq!(
        phone
            .upload("tc", "f", 1, true, &pattern(CHUNK_SIZE, 1))
            .await,
        reqwest::StatusCode::GONE
    );
    assert_eq!(wait_incoming(&pc.node).await.status, Status::Canceled);
}

#[tokio::test]
async fn rotating_the_room_locks_old_phones_out() {
    let pc = node("PC", true).await;
    let phone = Phone::from_invite(&pc.node, "phone-4");
    phone.hello().await;
    assert_eq!(pc.node.clients().len(), 1);
    pc.node.rotate_room().unwrap();
    let body = crypto::seal_json(
        &phone.data,
        "hello",
        &Hello {
            client_id: "phone-4".into(),
            name: "x".into(),
            platform: "ios".into(),
        },
    );
    let r = phone
        .req(reqwest::Method::POST, "/api/v1/b/hello")
        .body(body)
        .send()
        .await
        .unwrap();
    assert_eq!(r.status(), reqwest::StatusCode::UNAUTHORIZED);
    assert!(pc.node.clients().is_empty());
}

#[tokio::test]
async fn serves_web_client_with_security_headers() {
    let pc = node("PC", true).await;
    let r = reqwest::get(format!("http://127.0.0.1:{}/", pc.node.port()))
        .await
        .unwrap();
    assert!(r.status().is_success());
    let csp = r
        .headers()
        .get("content-security-policy")
        .unwrap()
        .to_str()
        .unwrap()
        .to_string();
    assert!(csp.contains("frame-ancestors 'none'"));
    assert!(r.text().await.unwrap().contains("Turbodrop"));
    let info: serde_json::Value =
        reqwest::get(format!("http://127.0.0.1:{}/api/v1/info", pc.node.port()))
            .await
            .unwrap()
            .json()
            .await
            .unwrap();
    assert_eq!(info["name"], "PC");
    assert!(info.get("secret").is_none());
}

#[tokio::test]
async fn devices_find_each_other_by_multicast() {
    if std::env::var("TURBODROP_SKIP_MULTICAST").is_ok() {
        return;
    }
    let port = 40000 + (std::process::id() % 20000) as u16;
    let a = node_with("Multicast-A", false, port).await;
    let b = node_with("Multicast-B", false, port).await;
    for _ in 0..120 {
        let seen_a = a
            .node
            .peers()
            .iter()
            .any(|p| p.device.id == b.node.device_id);
        let seen_b = b
            .node
            .peers()
            .iter()
            .any(|p| p.device.id == a.node.device_id);
        if seen_a && seen_b {
            return;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    panic!("devices did not discover each other (set TURBODROP_SKIP_MULTICAST=1 on networks without multicast)");
}
