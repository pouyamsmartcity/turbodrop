// The browser client is embedded from web/dist. A fresh checkout has no build yet, so leave a
// placeholder page instead of failing the Rust build; `npm run build` in web/ replaces it.
use std::path::PathBuf;

fn main() {
    let dist = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("../../web/dist");
    println!("cargo:rerun-if-changed={}", dist.display());
    if !dist.join("index.html").exists() {
        std::fs::create_dir_all(&dist).expect("create web/dist");
        std::fs::write(
            dist.join("index.html"),
            "<!doctype html><meta charset=utf-8><title>Turbodrop</title>\
             <p>The Turbodrop web client is not built. Run <code>npm run build</code> in <code>web/</code>.</p>",
        )
        .expect("write placeholder");
    }
}
