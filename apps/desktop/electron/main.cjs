// apps/desktop/electron/main.cjs
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// ---- single-instance: varsa onu öne getir
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on("second-instance", () => {
    if (global.win) {
      if (global.win.isMinimized()) global.win.restore();
      global.win.show(); global.win.focus();
    }
  });
}

let db, repos = {};
async function loadRepos() {
  // shared-db ESM ise dinamik import ile al
  const { openDb } = await import(path.join(__dirname, "..", "shared-db", "db.js"));
  repos.products = await import(path.join(__dirname, "..", "shared-db", "repositories", "productsRepo.js"));
  repos.sales    = await import(path.join(__dirname, "..", "shared-db", "repositories", "salesRepo.js"));
  repos.settings = await import(path.join(__dirname, "..", "shared-db", "repositories", "settingsRepo.js"));
  repos.reports  = await import(path.join(__dirname, "..", "shared-db", "repositories", "reportsRepo.js"));
  const appDataDir = path.join(app.getPath("appData"), "emr-pos");
  db = openDb(appDataDir);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,                 // ready-to-show ile aç
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  global.win = win;

  // Dev vs Prod içerik
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "bottom" });
  } else {
    // ÖNEMLİ: prod’da dist/index.html yükleyin
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // Görünürlük & konum güvenlikleri
  win.once("ready-to-show", () => {
    try {
      if (win.isMinimized()) win.restore();
      win.center();
      win.show();
      win.focus();
      // bazen “görünmez” kalabiliyor; bir kez AOT toggling
      win.setAlwaysOnTop(true, "screen-saver");
      setTimeout(() => win.setAlwaysOnTop(false), 300);
    } catch {}
  });

  // ready-to-show gelmezse 3 sn sonra zorla aç
  setTimeout(() => {
    if (!win.isVisible()) {
      try {
        win.setPosition(100, 100);
        win.show(); win.focus();
      } catch {}
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

// Basit yazdırma penceresi
ipcMain.handle("system:getPrinters", () => global.win?.webContents.getPrinters());
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
