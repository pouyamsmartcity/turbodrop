//! Turbodrop cryptography.
//!
//! Every payload (JSON envelopes and file chunks) is sealed with XChaCha20-Poly1305 under a
//! per-session key. Browser sessions get their 32-byte root key from the QR code fragment, which
//! browsers never send over the network. Native peers derive a key from X25519 (ephemeral-static
//! plus static-static, so both ends are authenticated by their long-term keys).

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use hkdf::Hkdf;
use rand::RngCore;
use sha2::{Digest, Sha256};
use x25519_dalek::{PublicKey, StaticSecret};

pub const KEY_LEN: usize = 32;
pub const NONCE_LEN: usize = 24;
pub const TAG_LEN: usize = 16;
/// Bytes a sealed message adds on top of its plaintext.
pub const OVERHEAD: usize = NONCE_LEN + TAG_LEN;

#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("message failed authentication")]
    Auth,
    #[error("message too short")]
    Short,
    #[error("bad key encoding")]
    Encoding,
}

/// A 32-byte symmetric key.
#[derive(Clone)]
pub struct Key(pub [u8; KEY_LEN]);

impl std::fmt::Debug for Key {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Key(..)")
    }
}

impl Key {
    pub fn random() -> Self {
        let mut k = [0u8; KEY_LEN];
        rand::rngs::OsRng.fill_bytes(&mut k);
        Key(k)
    }

    pub fn to_b64(&self) -> String {
        URL_SAFE_NO_PAD.encode(self.0)
    }

    pub fn from_b64(s: &str) -> Result<Self, CryptoError> {
        let v = URL_SAFE_NO_PAD
            .decode(s.trim())
            .map_err(|_| CryptoError::Encoding)?;
        let arr: [u8; KEY_LEN] = v.try_into().map_err(|_| CryptoError::Encoding)?;
        Ok(Key(arr))
    }

    /// HKDF-SHA256 sub-key for a purpose label.
    pub fn derive(&self, label: &str) -> Key {
        let hk = Hkdf::<Sha256>::new(None, &self.0);
        let mut out = [0u8; KEY_LEN];
        hk.expand(label.as_bytes(), &mut out)
            .expect("32 bytes is a valid HKDF length");
        Key(out)
    }
}

/// Labels shared with the browser client (web/src/lib/crypto.ts). Changing one is a protocol break.
pub const LABEL_AUTH: &str = "turbodrop/v1 auth";
pub const LABEL_DATA: &str = "turbodrop/v1 data";
pub const LABEL_PEER: &str = "turbodrop/v1 peer";

/// The bearer token a browser presents. It is derived one-way from the root key, so a passive
/// listener who sees it learns nothing about the data key.
pub fn auth_token(root: &Key) -> String {
    root.derive(LABEL_AUTH).to_b64()
}

pub fn random_nonce() -> [u8; NONCE_LEN] {
    let mut n = [0u8; NONCE_LEN];
    rand::rngs::OsRng.fill_bytes(&mut n);
    n
}

/// Seal with an explicit nonce (used by tests and test vectors). Output: nonce || ciphertext || tag.
pub fn seal_with_nonce(
    key: &Key,
    nonce: &[u8; NONCE_LEN],
    aad: &[u8],
    plaintext: &[u8],
) -> Vec<u8> {
    let cipher = XChaCha20Poly1305::new((&key.0).into());
    let ct = cipher
        .encrypt(
            XNonce::from_slice(nonce),
            Payload {
                msg: plaintext,
                aad,
            },
        )
        .expect("XChaCha20-Poly1305 encryption cannot fail for in-memory buffers");
    let mut out = Vec::with_capacity(NONCE_LEN + ct.len());
    out.extend_from_slice(nonce);
    out.extend_from_slice(&ct);
    out
}

pub fn seal(key: &Key, aad: &[u8], plaintext: &[u8]) -> Vec<u8> {
    seal_with_nonce(key, &random_nonce(), aad, plaintext)
}

pub fn open(key: &Key, aad: &[u8], sealed: &[u8]) -> Result<Vec<u8>, CryptoError> {
    if sealed.len() < OVERHEAD {
        return Err(CryptoError::Short);
    }
    let (nonce, ct) = sealed.split_at(NONCE_LEN);
    let cipher = XChaCha20Poly1305::new((&key.0).into());
    cipher
        .decrypt(XNonce::from_slice(nonce), Payload { msg: ct, aad })
        .map_err(|_| CryptoError::Auth)
}

/// AAD for a file chunk. Binding transfer, file, index and the last-chunk flag stops chunks from
/// being reordered, replayed into another file, or a transfer from being silently truncated.
pub fn chunk_aad(transfer_id: &str, file_id: &str, index: u64, last: bool) -> Vec<u8> {
    format!("td1|chunk|{transfer_id}|{file_id}|{index}|{}", last as u8).into_bytes()
}

/// AAD for a JSON envelope with a purpose ("hello", "offer", "event", ...).
pub fn json_aad(purpose: &str) -> Vec<u8> {
    format!("td1|json|{purpose}").into_bytes()
}

/// Seal a serializable value as JSON.
pub fn seal_json<T: serde::Serialize>(key: &Key, purpose: &str, value: &T) -> Vec<u8> {
    let bytes = serde_json::to_vec(value).expect("serializable");
    seal(key, &json_aad(purpose), &bytes)
}

pub fn open_json<T: serde::de::DeserializeOwned>(
    key: &Key,
    purpose: &str,
    sealed: &[u8],
) -> anyhow::Result<T> {
    let bytes = open(key, &json_aad(purpose), sealed)?;
    Ok(serde_json::from_slice(&bytes)?)
}

/// A device's long-term X25519 identity.
#[derive(Clone)]
pub struct Identity {
    secret: StaticSecret,
    pub public: PublicKey,
}

impl Identity {
    pub fn generate() -> Self {
        let secret = StaticSecret::random_from_rng(rand::rngs::OsRng);
        let public = PublicKey::from(&secret);
        Identity { secret, public }
    }

    pub fn from_secret_b64(s: &str) -> Result<Self, CryptoError> {
        let k = Key::from_b64(s)?;
        let secret = StaticSecret::from(k.0);
        let public = PublicKey::from(&secret);
        Ok(Identity { secret, public })
    }

    pub fn secret_b64(&self) -> String {
        URL_SAFE_NO_PAD.encode(self.secret.to_bytes())
    }

    pub fn public_b64(&self) -> String {
        URL_SAFE_NO_PAD.encode(self.public.as_bytes())
    }

    pub fn fingerprint(&self) -> String {
        fingerprint(self.public.as_bytes())
    }
}

pub fn public_from_b64(s: &str) -> Result<PublicKey, CryptoError> {
    let k = Key::from_b64(s)?;
    Ok(PublicKey::from(k.0))
}

/// Short hex fingerprint of a public key (first 8 bytes of SHA-256), grouped for reading aloud.
pub fn fingerprint(public: &[u8; 32]) -> String {
    let h = Sha256::digest(public);
    h[..8]
        .chunks(2)
        .map(|c| format!("{:02X}{:02X}", c[0], c[1]))
        .collect::<Vec<_>>()
        .join("-")
}

/// Emoji verification code both screens show for a pair of devices. Order-independent.
pub fn verification_code(a: &[u8; 32], b: &[u8; 32]) -> String {
    const EMOJI: [&str; 32] = [
        "🚀", "🌙", "🍉", "🎧", "🦊", "🌵", "⚡", "🎈", "🐳", "🍀", "🔥", "🎲", "🦋", "🍩", "🌈",
        "🐢", "🎯", "🧊", "🌻", "🐙", "🍋", "🛸", "🎸", "🦉", "🍄", "⛵", "🐝", "🧩", "🌊", "🦄",
        "🍒", "🔑",
    ];
    let (x, y) = if a <= b { (a, b) } else { (b, a) };
    let mut h = Sha256::new();
    h.update(b"turbodrop/v1 verify");
    h.update(x);
    h.update(y);
    let d = h.finalize();
    d[..4]
        .iter()
        .map(|b| EMOJI[(*b as usize) % 32])
        .collect::<Vec<_>>()
        .join(" ")
}

/// Sender side of the native peer handshake. Returns (ephemeral public key, session key).
pub fn peer_key_sender(me: &Identity, receiver: &PublicKey) -> (PublicKey, Key) {
    let eph = StaticSecret::random_from_rng(rand::rngs::OsRng);
    let eph_pub = PublicKey::from(&eph);
    let es = eph.diffie_hellman(receiver);
    let ss = me.secret.diffie_hellman(receiver);
    let key = peer_kdf(es.as_bytes(), ss.as_bytes(), &eph_pub, &me.public, receiver);
    (eph_pub, key)
}

/// Receiver side of the native peer handshake.
pub fn peer_key_receiver(me: &Identity, eph_pub: &PublicKey, sender_static: &PublicKey) -> Key {
    let es = me.secret.diffie_hellman(eph_pub);
    let ss = me.secret.diffie_hellman(sender_static);
    peer_kdf(
        es.as_bytes(),
        ss.as_bytes(),
        eph_pub,
        sender_static,
        &me.public,
    )
}

fn peer_kdf(es: &[u8; 32], ss: &[u8; 32], e: &PublicKey, s: &PublicKey, r: &PublicKey) -> Key {
    let mut ikm = Vec::with_capacity(64);
    ikm.extend_from_slice(es);
    ikm.extend_from_slice(ss);
    let mut info = LABEL_PEER.as_bytes().to_vec();
    info.extend_from_slice(e.as_bytes());
    info.extend_from_slice(s.as_bytes());
    info.extend_from_slice(r.as_bytes());
    let hk = Hkdf::<Sha256>::new(None, &ikm);
    let mut out = [0u8; KEY_LEN];
    hk.expand(&info, &mut out).expect("valid length");
    Key(out)
}

pub fn random_id(bytes: usize) -> String {
    let mut b = vec![0u8; bytes];
    rand::rngs::OsRng.fill_bytes(&mut b);
    URL_SAFE_NO_PAD.encode(b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seal_open_roundtrip() {
        let k = Key::random();
        let s = seal(&k, b"aad", b"hello turbodrop");
        assert_eq!(s.len(), 15 + OVERHEAD);
        assert_eq!(open(&k, b"aad", &s).unwrap(), b"hello turbodrop");
    }

    #[test]
    fn wrong_aad_or_key_or_tamper_fails() {
        let k = Key::random();
        let mut s = seal(&k, b"aad", b"payload");
        assert!(open(&k, b"other", &s).is_err());
        assert!(open(&Key::random(), b"aad", &s).is_err());
        let last = s.len() - 1;
        s[last] ^= 1;
        assert!(open(&k, b"aad", &s).is_err());
        assert!(matches!(
            open(&k, b"aad", &[0u8; 10]),
            Err(CryptoError::Short)
        ));
    }

    #[test]
    fn chunk_aad_binds_position() {
        let k = Key::random();
        let s = seal(&k, &chunk_aad("t", "f", 3, false), b"x");
        assert!(open(&k, &chunk_aad("t", "f", 4, false), &s).is_err());
        assert!(open(&k, &chunk_aad("t", "f", 3, true), &s).is_err());
        assert!(open(&k, &chunk_aad("t", "g", 3, false), &s).is_err());
        assert!(open(&k, &chunk_aad("t", "f", 3, false), &s).is_ok());
    }

    #[test]
    fn peer_handshake_agrees_and_authenticates() {
        let alice = Identity::generate();
        let bob = Identity::generate();
        let (eph, k1) = peer_key_sender(&alice, &bob.public);
        let k2 = peer_key_receiver(&bob, &eph, &alice.public);
        assert_eq!(k1.0, k2.0);
        // A third party claiming to be Alice ends up with a different key.
        let mallory = Identity::generate();
        let k3 = peer_key_receiver(&bob, &eph, &mallory.public);
        assert_ne!(k1.0, k3.0);
    }

    #[test]
    fn identity_roundtrip_and_codes() {
        let a = Identity::generate();
        let b = Identity::from_secret_b64(&a.secret_b64()).unwrap();
        assert_eq!(a.public_b64(), b.public_b64());
        assert_eq!(a.fingerprint().len(), 19);
        let c = Identity::generate();
        let v1 = verification_code(a.public.as_bytes(), c.public.as_bytes());
        let v2 = verification_code(c.public.as_bytes(), a.public.as_bytes());
        assert_eq!(v1, v2);
        assert_eq!(v1.split(' ').count(), 4);
    }

    #[test]
    fn key_b64_rejects_garbage() {
        assert!(Key::from_b64("short").is_err());
        let k = Key::random();
        assert_eq!(Key::from_b64(&k.to_b64()).unwrap().0, k.0);
    }

    /// Fixed vectors shared with the browser client's tests (web/src/lib/crypto.test.ts).
    #[test]
    fn interop_vectors() {
        let root = Key([7u8; 32]);
        let data = root.derive(LABEL_DATA);
        let nonce = [9u8; 24];
        let sealed = seal_with_nonce(&data, &nonce, &chunk_aad("T", "F", 0, true), b"turbodrop");
        let v: serde_json::Value =
            serde_json::from_str(include_str!("../../../test-vectors/crypto.json")).unwrap();
        assert_eq!(auth_token(&root), v["authToken"].as_str().unwrap());
        assert_eq!(data.to_b64(), v["dataKey"].as_str().unwrap());
        assert_eq!(
            URL_SAFE_NO_PAD.encode(&sealed),
            v["sealedChunk"].as_str().unwrap()
        );
    }
}

#[cfg(test)]
mod vector_gen {
    use super::*;
    #[test]
    #[ignore]
    fn print_vectors() {
        let root = Key([7u8; 32]);
        let data = root.derive(LABEL_DATA);
        let sealed = seal_with_nonce(
            &data,
            &[9u8; 24],
            &chunk_aad("T", "F", 0, true),
            b"turbodrop",
        );
        let json_sealed = seal_with_nonce(&data, &[5u8; 24], &json_aad("hello"), br#"{"a":1}"#);
        println!(
            "{}",
            serde_json::json!({
                "rootKey": root.to_b64(),
                "authToken": auth_token(&root),
                "dataKey": data.to_b64(),
                "chunk": {"transferId": "T", "fileId": "F", "index": 0, "last": true, "nonce": URL_SAFE_NO_PAD.encode([9u8; 24]), "plaintext": "turbodrop"},
                "sealedChunk": URL_SAFE_NO_PAD.encode(&sealed),
                "json": {"purpose": "hello", "nonce": URL_SAFE_NO_PAD.encode([5u8; 24]), "plaintext": "{\"a\":1}"},
                "sealedJson": URL_SAFE_NO_PAD.encode(&json_sealed)
            })
        );
    }
}
