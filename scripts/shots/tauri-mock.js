// A stand-in for the Tauri runtime so the real desktop UI can run in a plain browser with demo
// data — used for README screenshots and the promo film. Never shipped in the app.
(() => {
  const q = new URLSearchParams(location.search);
  const lang = q.get('lang') || 'en';
  const theme = q.get('theme') || 'dark';
  const now = Date.now();
  const MB = 1024 * 1024;
  const fa = lang === 'fa';

  const peers = [
    { device: { id: 'mac', name: fa ? 'مک‌بوکِ سارا' : 'Sara’s MacBook', platform: 'macos', version: '0.1.0', port: 47474, publicKey: 'k1', fingerprint: '4A12-5D65-BC56-B6E4' }, address: '192.168.1.24', lastSeen: now, source: 'lan', trusted: true, verification: '🌵 🍄 🦉 🎧', keyChanged: false },
    { device: { id: 'pc', name: fa ? 'کامپیوتر اتاق کار' : 'Studio PC', platform: 'windows', version: '0.1.0', port: 47474, publicKey: 'k2', fingerprint: '9C01-77AE-11B2-0F3D' }, address: '192.168.1.31', lastSeen: now, source: 'lan', trusted: false, verification: '🚀 🍉 🐳 ⚡', keyChanged: false },
    { device: { id: 'linux', name: 'Ubuntu Workstation', platform: 'linux', version: '0.1.0', port: 47474, publicKey: 'k3', fingerprint: '2B7C-0A44-9E10-CC51' }, address: '192.168.1.40', lastSeen: now, source: 'lan', trusted: false, verification: '🦊 🌈 🎯 🍋', keyChanged: false },
  ];
  const clients = [
    { id: 'iphone', name: 'iPhone 15 Pro', platform: 'ios', online: true, lastSeen: now },
    { id: 'pixel', name: 'Pixel 8', platform: 'android', online: true, lastSeen: now },
    { id: 'ipad', name: 'iPad Air', platform: 'ios', online: false, lastSeen: now - 3 * 3600e3 },
  ];
  const f = (id, name, size, done, status, path = name) => ({ id, name, path, size, doneBytes: done, status, localPath: 'C:\\Users\\you\\Downloads\\Turbodrop\\' + path.replace(/\//g, '\\'), resumed: false });
  const transfers = [
    { id: 't1', direction: 'out', kind: 'browser', peerId: 'iphone', peerName: 'iPhone 15 Pro', peerPlatform: 'ios', status: 'active', files: [f('a', 'Wedding-4K.mp4', 3.8 * 1024 * MB, 2.37 * 1024 * MB, 'active')], totalBytes: 3.8 * 1024 * MB, doneBytes: 2.37 * 1024 * MB, speed: 61.4 * MB, startedAt: now - 40e3 },
    { id: 't2', direction: 'in', kind: 'browser', peerId: 'pixel', peerName: 'Pixel 8', peerPlatform: 'android', status: 'active', files: [f('b', 'IMG_2041.HEIC', 4.1 * MB, 1.2 * MB, 'active', 'Camera/IMG_2041.HEIC'), f('c', 'IMG_2042.HEIC', 3.9 * MB, 0, 'pending', 'Camera/IMG_2042.HEIC')], totalBytes: 8 * MB, doneBytes: 1.2 * MB, speed: 28.7 * MB, startedAt: now - 2e3 },
    { id: 't3', direction: 'in', kind: 'device', peerId: 'mac', peerName: fa ? 'مک‌بوکِ سارا' : 'Sara’s MacBook', peerPlatform: 'macos', status: 'done', files: [{ ...f('d', 'Thesis-final.pdf', 18.2 * MB, 18.2 * MB, 'done'), resumed: true }], totalBytes: 18.2 * MB, doneBytes: 18.2 * MB, speed: 0, startedAt: now - 9 * 60e3, finishedAt: now - 8 * 60e3, verification: '🌵 🍄 🦉 🎧' },
    { id: 't4', direction: 'in', kind: 'browser', peerId: 'iphone', peerName: 'iPhone 15 Pro', peerPlatform: 'ios', status: 'done', files: Array.from({ length: 48 }, (_, i) => f('p' + i, `IMG_${3100 + i}.JPG`, 3.2 * MB, 3.2 * MB, 'done', `${fa ? 'سفر شمال' : 'Holiday 2026'}/IMG_${3100 + i}.JPG`)), totalBytes: 48 * 3.2 * MB, doneBytes: 48 * 3.2 * MB, speed: 0, startedAt: now - 3600e3, finishedAt: now - 3540e3 },
    { id: 't5', direction: 'in', kind: 'browser', peerId: 'iphone', peerName: 'iPhone 15 Pro', peerPlatform: 'ios', status: 'done', files: [], totalBytes: 0, doneBytes: 0, speed: 0, startedAt: now - 2 * 3600e3, finishedAt: now - 2 * 3600e3, text: 'https://www.pouyam.com' },
    { id: 't6', direction: 'out', kind: 'device', peerId: 'linux', peerName: 'Ubuntu Workstation', peerPlatform: 'linux', status: 'done', files: [f('e', 'turbodrop-src.zip', 212 * MB, 212 * MB, 'done')], totalBytes: 212 * MB, doneBytes: 212 * MB, speed: 0, startedAt: now - 26 * 3600e3, finishedAt: now - 26 * 3600e3 },
  ];
  const snapshot = {
    info: { id: 'me', name: fa ? 'لپ‌تاپ پویام' : 'Pouyam-Laptop', platform: 'windows', version: '0.1.0', port: 47474, publicKey: 'me', fingerprint: '7E3A-91C4-55D0-A2F8' },
    settings: { deviceName: fa ? 'لپ‌تاپ پویام' : 'Pouyam-Laptop', downloadDir: 'C:\\Users\\you\\Downloads\\Turbodrop', requireApproval: true, askBrowsers: false },
    app: { theme, lang, accent: q.get('accent') || 'aurora', autostart: true, tray: true, contextMenu: true, notifications: true, keepAwake: true },
    invite: { port: 47474, urls: [{ label: 'Wi-Fi', ip: '192.168.1.10', url: 'http://192.168.1.10:47474/#Qm3x9KpLw2Ta.7Hk2Jq9VrX4bN8sYc1LpE0wZ5uF3dGiAoT6mRyKxQe' }, { label: 'Ethernet', ip: '10.0.0.5', url: 'http://10.0.0.5:47474/#Qm3x9KpLw2Ta.7Hk2Jq9VrX4bN8sYc1LpE0wZ5uF3dGiAoT6mRyKxQe' }] },
    peers,
    clients,
    transfers: q.get('empty') ? [] : transfers,
    trusted: [{ id: 'mac', name: peers[0].device.name, publicKey: 'k1' }],
    platform: 'windows',
  };

  const handlers = {};
  let next = 1;
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: 'main' }, currentWebview: { windowLabel: 'main', label: 'main' } },
    transformCallback(cb) {
      const id = next++;
      window['_' + id] = cb;
      return id;
    },
    unregisterCallback(id) {
      delete window['_' + id];
    },
    convertFileSrc: (p) => p,
    async invoke(cmd, args) {
      switch (cmd) {
        case 'get_state':
          return snapshot;
        case 'take_pending_files':
          return [];
        case 'qr_svg':
          return window.__QR_SVG__ || '';
        case 'path_kinds':
          return args.paths.map((p, i) => [p, !/\.[a-z0-9]{2,4}$/i.test(p), [2.4e9, 18e6, 412e6, 5e6][i % 4]]);
        case 'plugin:event|listen':
          (handlers[args.event] ||= []).push(args.handler);
          return next++;
        default:
          return null;
      }
    },
  };
  window.__emit = (event, payload) => (handlers[event] || []).forEach((id) => window['_' + id]?.({ event, id, payload }));
})();
