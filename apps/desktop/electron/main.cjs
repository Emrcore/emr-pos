// apps/desktop/electron/main.cjs
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

// ---- LOGGING (Windows'ta konsola yaz)
process.env.ELECTRON_ENABLE_LOGGING = "1";
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

// ---- GPU'yu kapat (siyah ekran/boş pencere için)
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
// Bazı makinelerde faydalı:
app.commandLine.appendSwitch("in-process-gpu");

// ---- single-instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on("second-instance", () => {
    const w = global.mainWindow;
    if (w) {
      if (w.isMinimized()) w.restore();
      w.show(); w.focus();
    }
  });
}

let db, repos = {};
async function loadRepos() {
  // shared-db ESM ise dinamik import ile al
  const base = path.join(__dirname, "..", "shared-db");
  const { openDb } = await import(path.join(base, "db.js"));
  repos.products = await import(path.join(base, "repositories", "productsRepo.js"));
  repos.sales    = await import(path.join(base, "repositories", "salesRepo.js"));
  repos.settings = await import(path.join(base, "repositories", "settingsRepo.js"));
  repos.reports  = await import(path.join(base, "repositories", "reportsRepo.js"));

  const appDataDir = path.join(app.getPath("appData"), "emr-pos");
  db = openDb(appDataDir);
}

function clampToScreen(bounds) {
  try {
    const { workArea } = screen.getPrimaryDisplay();
    const safeW = Math.min(Math.max(bounds.width || 1280, 800), workArea.width);
    const safeH = Math.min(Math.max(bounds.height || 800, 600), workArea.height);
    const x = Math.max(workArea.x, Math.min((bounds.x ?? 100), workArea.x + workArea.width  - safeW));
    const y = Math.max(workArea.y, Math.min((bounds.y ?? 100), workArea.y + workArea.height - safeH));
    return { x, y, width: safeW, height: safeH };
  } catch { return { x: 100, y: 100, width: 1280, height: 800 }; }
}

function createWindow() {
  const safe = clampToScreen({ width: 1280, height: 800 });

  const win = new BrowserWindow({
    ...safe,
    show: false,                  // ready-to-show ile aç
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    useContentSize: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  global.mainWindow = win;

  // Yükleme yolu (DEV vs PROD)
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "bottom" });
  } else {
    // asar içinde çalışır: __dirname = app.asar/electron
    const indexHtml = path.join(__dirname, "..", "dist", "index.html");
    win.loadFile(indexHtml).catch(err => {
      console.error("loadFile error:", err);
    });
  }

  // Yükleme/Çökme olayları -> log
  win.webContents.on("did-fail-load", (e, code, desc, url, isMainFrame) => {
    console.error("did-fail-load", { code, desc, url, isMainFrame });
  });
  win.webContents.on("render-process-gone", (e, details) => {
    console.error("render-process-gone", details);
  });
  win.on("unresponsive", () => console.error("Window unresponsive"));

  // Görünürlük
  win.once("ready-to-show", () => {
    try {
      if (win.isMinimized()) win.restore();
      const s = clampToScreen(win.getBounds());
      win.setBounds(s);
      win.show(); win.focus();

      // bazı makinelerde görünürlüğü garantilemek için kısa AOT toggle
      win.setAlwaysOnTop(true, "screen-saver");
      setTimeout(() => win.setAlwaysOnTop(false), 300);
    } catch (e) {
      console.error("ready-to-show show() error", e);
    }
  });

  // Fallback: 3 sn sonra hâlâ görünmüyorsa zorla göster
  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) {
      try {
        const s = clampToScreen({ x: 100, y: 100, width: 1200, height: 740 });
        win.setBounds(s);
        win.show(); win.focus();
        win.moveTop();
      } catch (e) {
        console.error("force-show fallback error", e);
      }
    }
  }, 3000);

  return win;
}

app.whenReady().then(async () => {
  await loadRepos();
  createWindow();
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ---------- IPC ----------
ipcMain.handle("db:products:list", () => repos.products.list(db));
ipcMain.handle("db:products:findByBarcode", (e, barcode) => repos.products.findByBarcode(db, barcode));
ipcMain.handle("db:products:insert", (e, product) => repos.products.insert(db, product));

ipcMain.handle("db:sales:create", (e, payload) => repos.sales.create(db, payload));

ipcMain.handle("db:settings:get", (e, key) => repos.settings.get(db, key));
ipcMain.handle("db:settings:set", (e, { key, value }) => repos.settings.set(db, key, value));

ipcMain.handle("report:summary", (e, { start, end }) => repos.reports.getSummary(db, start, end));

ipcMain.handle("system:getPrinters", () => global.mainWindow?.webContents.getPrinters());
ipcMain.handle("print:receipt", async (e, data) => {
  const p = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  const html = buildReceiptHTML(data);
  await p.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
  await p.webContents.print({ silent: false, printBackground: true });
  p.close();
});

function buildReceiptHTML(data) {
  const items = (data.items || []).map(
    i => `<tr><td>${i.name}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">${i.unit}</td><td style="text-align:right">${i.total}</td></tr>`
  ).join("");
  return `
  <html><head><meta charset="utf-8">
  <style>
    body{ font-family: monospace; width: 280px; }
    table{ width:100%; border-collapse:collapse; }
    td{ padding:2px 0; }
    h3, h4 { margin: 4px 0; text-align:center; }
    hr { border: 0; border-top: 1px dashed #333; margin: 6px 0; }
  </style></head>
  <body>
    <h3>${data.header?.title || "EMR POS"}</h3>
    <h4>${data.header?.date || ""}</h4>
    <table>${items}</table>
    <hr/>
    <table>
      <tr><td>Ara Toplam</td><td style="text-align:right">${data.summary?.subtotal ?? ""}</td></tr>
      <tr><td>KDV</td><td style="text-align:right">${data.summary?.vat ?? ""}</td></tr>
      <tr><td><b>TOPLAM</b></td><td style="text-align:right"><b>${data.summary?.total ?? ""}</b></td></tr>
      <tr><td>Ödeme</td><td style="text-align:right">${data.summary?.payment ?? ""}</td></tr>
    </table>
    <p style="text-align:center">${data.footer || "Teşekkür ederiz"}</p>
  </body></html>`;
}
