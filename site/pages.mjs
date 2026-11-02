// Plain content pages next to the landing page: download (with the code signing policy) and privacy.

const REPO = 'https://github.com/pouyamsmartcity/turbodrop';
const DL = `${REPO}/releases/latest/download`;

function shell(title, desc, body) {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} · Turbodrop</title>
<meta name="description" content="${desc}" />
<link rel="icon" href="../favicon.svg" type="image/svg+xml" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="../style.css" />
</head>
<body>
<div class="aurora"></div>
<header class="top">
  <a class="brand" href="../"><img src="../favicon.svg" width="30" height="30" alt="" />Turbodrop</a>
  <nav><a href="../">Home</a><a href="../download/">Download</a><a href="../privacy/">Privacy</a><a href="${REPO}">GitHub</a></nav>
  <div class="right"><a class="lang" href="../fa/">فارسی</a></div>
</header>
<main class="doc">
${body}
</main>
<footer><p>Made with ❤️ by <a href="https://www.pouyam.com">Pouyam</a> · MIT License · <a href="${REPO}">Source code</a></p></footer>
</body>
</html>`;
}

export function downloadPage() {
  const row = (os, file, note) => `<tr><th>${os}</th><td><a class="btn small" href="${DL}/${file}" title="${file}">Download</a></td><td>${note}</td></tr>`;
  return shell(
    'Download',
    'Download Turbodrop for Windows, macOS and Linux. Phones need nothing — they scan the QR code.',
    `<h1>Download Turbodrop</h1>
<p class="lead">Phones (iPhone, iPad, Android) need nothing: open Turbodrop on a computer and scan its QR code.
Every file below is built from the public source code by <a href="${REPO}/actions">GitHub Actions</a>.
The newest files are always on the <a href="${REPO}/releases/latest">latest release</a> page.</p>
<table class="dl">
<tbody>
${row('Windows', 'Turbodrop_0.1.0_x64-setup.exe', 'Recommended. Installs for your user only, no admin needed.')}
${row('Windows (MSI)', 'Turbodrop_0.1.0_x64_en-US.msi', 'For managed deployments.')}
${row('macOS (Apple silicon)', 'Turbodrop_0.1.0_aarch64.dmg', 'First launch: right-click → Open.')}
${row('macOS (Intel)', 'Turbodrop_0.1.0_x64.dmg', 'First launch: right-click → Open.')}
${row('Linux (Debian/Ubuntu)', 'Turbodrop_0.1.0_amd64.deb', '')}
${row('Linux (AppImage)', 'Turbodrop_0.1.0_amd64.AppImage', '')}
${row('Command line', 'turbodrop-windows-x64.exe', 'Also turbodrop-macos-arm64, turbodrop-macos-x64 and turbodrop-linux-x64.')}
</tbody>
</table>

<h2 id="code-signing">Code signing policy</h2>
<p>Free code signing for the Windows builds is provided by <a href="https://about.signpath.io/">SignPath.io</a>,
certificate by <a href="https://signpath.org/">SignPath Foundation</a>.</p>
<ul>
  <li><b>Committers and reviewers:</b> members of the <a href="https://github.com/orgs/pouyamsmartcity/people">pouyamsmartcity</a> GitHub organization.
  Every change reaches the <code>main</code> branch through a pull request that must pass CI.</li>
  <li><b>Approvers:</b> the <a href="https://www.pouyam.com">Pouyam</a> team, who approve each signing request for a release.</li>
  <li><b>Builds:</b> signed files are built only by the <a href="${REPO}/blob/main/.github/workflows/release.yml">release workflow</a> from a tagged commit of this repository.</li>
  <li><b>Privacy:</b> see the <a href="../privacy/">privacy policy</a> — Turbodrop does not transfer any information to other networked systems unless the user asks it to.</li>
</ul>
<p class="tiny">Until signing is in place, Windows SmartScreen may show “Windows protected your PC” for a new release: click <b>More info → Run anyway</b>.</p>`,
  );
}

export function privacyPage() {
  return shell(
    'Privacy',
    'Turbodrop privacy policy: no accounts, no telemetry, no servers. Files go directly between your own devices.',
    `<h1>Privacy policy</h1>
<p class="lead">Short version: Turbodrop does not collect anything. There are no accounts, no analytics, no telemetry and no Turbodrop servers.</p>
<h2>What Turbodrop sends, and where</h2>
<ul>
  <li><b>Files, folders and text</b> go only to the devices you choose, directly over your local network, end-to-end encrypted.</li>
  <li><b>Device discovery:</b> while it runs, Turbodrop announces this device's name, platform and public key on the local network (UDP multicast) so your other devices can find it. It never leaves your network.</li>
  <li><b>Nothing else.</b> This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.</li>
</ul>
<h2>What stays on your device</h2>
<ul>
  <li>Settings, the device's encryption keys, trusted devices, the list of phones that joined, and the transfer history are stored locally
  (on Windows in <code>%APPDATA%\\Turbodrop</code>). Uninstalling and deleting that folder removes them.</li>
  <li>Phones keep the connection key for the computer they scanned in the browser's local storage; clearing the site data removes it.</li>
</ul>
<h2>Links</h2>
<p>Opening a link from inside the app (for example to GitHub or pouyam.com) opens your browser; those sites have their own policies.</p>
<p>Questions: open an issue on <a href="${REPO}/issues">GitHub</a>. Security reports: see <a href="${REPO}/blob/main/SECURITY.md">SECURITY.md</a>.</p>
<p class="tiny">Last updated: November 2, 2026.</p>`,
  );
}
