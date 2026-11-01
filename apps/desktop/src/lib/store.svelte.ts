// Desktop app state: a mirror of the Rust node, kept fresh by `td-event`s.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { detectLang, isRtl, type Lang, type MessageKey } from '../../../../shared/i18n';

export type Status = 'waiting' | 'active' | 'done' | 'declined' | 'canceled' | 'failed';
export type FileStatus = 'pending' | 'active' | 'done' | 'skipped' | 'failed';

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  version: string;
  port: number;
  publicKey: string;
  fingerprint: string;
}
export interface Peer {
  device: DeviceInfo;
  address: string;
  lastSeen: number;
  source: string;
  trusted: boolean;
  verification: string;
  keyChanged: boolean;
}
export interface BrowserClient {
  id: string;
  name: string;
  platform: string;
  online: boolean;
  lastSeen: number;
}
export interface FileView {
  id: string;
  name: string;
  path: string;
  size: number;
  doneBytes: number;
  status: FileStatus;
  localPath?: string;
  resumed: boolean;
}
export interface TransferView {
  id: string;
  direction: 'in' | 'out';
  kind: 'device' | 'browser';
  peerId: string;
  peerName: string;
  peerPlatform: string;
  status: Status;
  files: FileView[];
  totalBytes: number;
  doneBytes: number;
  speed: number;
  startedAt: number;
  finishedAt?: number;
  text?: string;
  error?: string;
  verification?: string;
}
export interface Settings {
  deviceName: string;
  downloadDir: string;
  requireApproval: boolean;
  askBrowsers: boolean;
}
export interface AppSettings {
  theme: 'system' | 'dark' | 'light';
  lang: Lang | null;
  accent: string;
  autostart: boolean;
  tray: boolean;
  contextMenu: boolean;
  notifications: boolean;
  keepAwake: boolean;
}
export interface InviteUrl {
  label: string;
  ip: string;
  url: string;
}
export interface TrustedDevice {
  id: string;
  name: string;
  publicKey: string;
}
interface Snapshot {
  info: DeviceInfo;
  settings: Settings;
  app: AppSettings;
  invite: { urls: InviteUrl[]; port: number };
  peers: Peer[];
  clients: BrowserClient[];
  transfers: TransferView[];
  trusted: TrustedDevice[];
  platform: string;
}

type CoreEvent =
  | { type: 'peerUpdate'; peer: Peer }
  | { type: 'peerLost'; id: string }
  | { type: 'browserUpdate'; client: BrowserClient }
  | { type: 'incomingRequest'; transfer: TransferView }
  | { type: 'transferUpdate'; transfer: TransferView }
  | { type: 'textReceived'; transferId: string; from: { id: string; name: string; platform: string }; text: string }
  | { type: 'roomRotated' };

export interface Selection {
  path: string;
  isDir: boolean;
  size: number;
}

export interface Toast {
  id: number;
  kind: 'ok' | 'info' | 'error' | 'message';
  title: MessageKey;
  vars?: Record<string, string | number>;
  text?: string;
  transferId?: string;
}

export type View = 'home' | 'nearby' | 'transfers' | 'phone' | 'settings';

export const ACCENTS: Record<string, [string, string, string]> = {
  aurora: ['#22d3ee', '#6366f1', '#d946ef'],
  ocean: ['#38bdf8', '#2563eb', '#7c3aed'],
  sunset: ['#fbbf24', '#f43f5e', '#a855f7'],
  mint: ['#34d399', '#14b8a6', '#6366f1'],
  rose: ['#fb7185', '#e11d48', '#f59e0b'],
};

class Store {
  ready = $state(false);
  view = $state<View>('home');
  info = $state<DeviceInfo | null>(null);
  platform = $state('windows');
  settings = $state<Settings>({ deviceName: '', downloadDir: '', requireApproval: true, askBrowsers: false });
  app = $state<AppSettings>({ theme: 'system', lang: null, accent: 'aurora', autostart: false, tray: true, contextMenu: false, notifications: true, keepAwake: true });
  invite = $state<InviteUrl[]>([]);
  peers = $state<Peer[]>([]);
  clients = $state<BrowserClient[]>([]);
  transfers = $state<TransferView[]>([]);
  trusted = $state<TrustedDevice[]>([]);
  requests = $state<TransferView[]>([]);
  toasts = $state<Toast[]>([]);
  selection = $state<Selection[]>([]);
  selectionText = $state('');
  private toastId = 0;

  lang = $derived<Lang>(this.app.lang ?? detectLang());
  rtl = $derived(isRtl(this.lang));
  onlinePhones = $derived(this.clients.filter((c) => c.online));
  active = $derived(this.transfers.filter((t) => t.status === 'active' || t.status === 'waiting'));

  async init() {
    await this.refresh();
    await listen<CoreEvent>('td-event', (e) => this.onEvent(e.payload));
    await listen<string[]>('open-files', (e) => void this.addPaths(e.payload));
    await listen<View>('navigate', (e) => (this.view = e.payload));
    const pending = await invoke<string[]>('take_pending_files');
    if (pending.length) await this.addPaths(pending);
    this.ready = true;
  }

  async refresh() {
    const s = await invoke<Snapshot>('get_state');
    this.info = s.info;
    this.platform = s.platform;
    this.settings = s.settings;
    this.app = s.app;
    this.invite = s.invite.urls;
    this.peers = s.peers;
    this.clients = s.clients;
    this.transfers = s.transfers;
    this.trusted = s.trusted;
  }

  private onEvent(e: CoreEvent) {
    switch (e.type) {
      case 'peerUpdate': {
        const i = this.peers.findIndex((p) => p.device.id === e.peer.device.id);
        if (i >= 0) this.peers[i] = e.peer;
        else this.peers = [...this.peers, e.peer].sort((a, b) => a.device.name.localeCompare(b.device.name));
        break;
      }
      case 'peerLost':
        this.peers = this.peers.filter((p) => p.device.id !== e.id);
        break;
      case 'browserUpdate': {
        const i = this.clients.findIndex((c) => c.id === e.client.id);
        if (i >= 0) this.clients[i] = e.client;
        else this.clients = [e.client, ...this.clients];
        break;
      }
      case 'incomingRequest':
        if (!this.requests.some((r) => r.id === e.transfer.id)) this.requests = [...this.requests, e.transfer];
        this.upsertTransfer(e.transfer);
        break;
      case 'transferUpdate':
        this.upsertTransfer(e.transfer);
        if (e.transfer.status !== 'waiting') this.requests = this.requests.filter((r) => r.id !== e.transfer.id);
        if (e.transfer.status === 'done' && e.transfer.files.length) {
          this.toast({
            kind: 'ok',
            title: e.transfer.direction === 'in' ? 'toast.received' : 'toast.sent',
            vars: { name: e.transfer.peerName, n: e.transfer.files.length },
            transferId: e.transfer.id,
          });
        } else if (e.transfer.status === 'failed') {
          this.toast({ kind: 'error', title: 'toast.failed', vars: { error: e.transfer.error ?? '' } });
        }
        break;
      case 'textReceived':
        this.toast({ kind: 'message', title: 'toast.text', vars: { name: e.from.name }, text: e.text }, 0);
        break;
      case 'roomRotated':
        void this.refresh();
        break;
    }
  }

  private upsertTransfer(t: TransferView) {
    const i = this.transfers.findIndex((x) => x.id === t.id);
    if (i >= 0) this.transfers[i] = t;
    else this.transfers = [t, ...this.transfers];
  }

  toast(t: Omit<Toast, 'id'>, ttl = 5000) {
    const id = ++this.toastId;
    this.toasts = [...this.toasts, { ...t, id }].slice(-4);
    if (ttl) setTimeout(() => this.dismiss(id), ttl);
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  async addPaths(paths: string[]) {
    if (!paths.length) return;
    const kinds = await invoke<[string, boolean, number][]>('path_kinds', { paths });
    const have = new Set(this.selection.map((s) => s.path));
    this.selection = [...this.selection, ...kinds.filter(([p]) => !have.has(p)).map(([path, isDir, size]) => ({ path, isDir, size }))];
    this.view = 'home';
  }

  clearSelection() {
    this.selection = [];
    this.selectionText = '';
  }

  async send(target: { kind: 'device' | 'browser' | 'allBrowsers'; id?: string }) {
    const paths = this.selection.map((s) => s.path);
    const text = this.selectionText.trim() || null;
    try {
      await invoke('send', { target, paths, text });
      this.clearSelection();
    } catch (err) {
      this.toast({ kind: 'error', title: 'toast.failed', vars: { error: String(err) } });
    }
  }

  async sendDirect(target: { kind: 'device' | 'browser' | 'allBrowsers'; id?: string }, paths: string[]) {
    try {
      await invoke('send', { target, paths, text: null });
    } catch (err) {
      this.toast({ kind: 'error', title: 'toast.failed', vars: { error: String(err) } });
    }
  }

  respond(id: string, accept: boolean, trust: boolean) {
    this.requests = this.requests.filter((r) => r.id !== id);
    return invoke('respond', { id, accept, trust }).catch(() => {});
  }

  cancel(id: string) {
    return invoke('cancel', { id }).catch(() => {});
  }

  async addPeer(address: string) {
    try {
      await invoke<Peer>('add_peer', { address });
      return true;
    } catch (err) {
      this.toast({ kind: 'error', title: 'toast.addFailed', vars: { error: String(err) } });
      return false;
    }
  }

  async setTrusted(id: string, trusted: boolean) {
    await invoke('set_trusted', { id, trusted });
    await this.refresh();
  }

  async forgetClient(id: string) {
    await invoke('forget_client', { id });
    this.clients = this.clients.filter((c) => c.id !== id);
  }

  async rotateRoom() {
    const inv = await invoke<{ urls: InviteUrl[] }>('rotate_room');
    this.invite = inv.urls;
    this.clients = [];
  }

  async clearHistory() {
    await invoke('clear_history');
    this.transfers = this.transfers.filter((t) => t.status === 'active' || t.status === 'waiting');
  }

  async save() {
    try {
      await invoke('update_settings', { settings: $state.snapshot(this.settings), appSettings: $state.snapshot(this.app) });
      const s = await invoke<Snapshot>('get_state');
      this.info = s.info;
    } catch (err) {
      this.toast({ kind: 'error', title: 'toast.failed', vars: { error: String(err) } });
      await this.refresh();
    }
  }

  qr(text: string) {
    return invoke<string>('qr_svg', { text });
  }
  openPath(path: string) {
    return invoke('open_path', { path }).catch(() => {});
  }
  reveal(path: string) {
    return invoke('reveal', { path }).catch(() => {});
  }
  openUrl(url: string) {
    return invoke('open_url', { url }).catch(() => {});
  }
}

export const store = new Store();
