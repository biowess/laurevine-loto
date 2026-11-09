import { BrowserWindow, nativeImage, screen } from 'electron';
import { fileURLToPath } from 'node:url';

// Frameless splash shown while the app boots. Drop the artwork at main/resources/splash.png; without it the app starts normally.
const FILE = fileURLToPath(new URL('../resources/splash.png', import.meta.url));
const PAGE = fileURLToPath(new URL('../resources/splash.html', import.meta.url));
const BG = '#3d2f0d';
const MIN_MS = 1750;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openSplash() {
  const img = nativeImage.createFromPath(FILE), size = img.getSize();
  if (img.isEmpty() || !size.width || !size.height) return null;
  const { workArea: a } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const k = Math.min(640 / size.width, (a.width * 0.5) / size.width, (a.height * 0.5) / size.height);
  const width = Math.round(size.width * k), height = Math.round(size.height * k);
  const win = new BrowserWindow({
    width, height, x: Math.round(a.x + (a.width - width) / 2), y: Math.round(a.y + (a.height - height) / 2),
    useContentSize: true, frame: false, show: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    fullscreenable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: true, backgroundColor: BG,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: false },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  let shownAt = 0;
  const show = () => { if (shownAt || win.isDestroyed()) return; shownAt = Date.now(); win.show(); };
  win.webContents.once('did-finish-load', show);
  setTimeout(show, 1500).unref();
  win.loadFile(PAGE).catch((err) => { console.error('[splash] load failed:', err); show(); });
  return {
    // Resolves once the splash has been visible for the minimum time.
    async minTime() { while (!win.isDestroyed() && (!shownAt || Date.now() < shownAt + MIN_MS)) await sleep(40); },
    async close() {
      await this.minTime();
      if (win.isDestroyed()) return;
      try { for (let o = 0.85; o > 0; o -= 0.15) { win.setOpacity(o); await sleep(18); if (win.isDestroyed()) return; } } catch {}
      if (!win.isDestroyed()) win.destroy();
    },
  };
}
