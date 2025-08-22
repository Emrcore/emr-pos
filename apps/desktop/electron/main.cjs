// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

function toFileUrl(p) { return pathToFileURL(p).href; }

async function importESM(absPath) {
  return import(toFileUrl(absPath));
}

function resolveFromAppRoot(...segments) {
  // app.getAppPath() => ...\resources\app.asar  (veya dev’de proje kökü)
  const appRoot = app.getAppPath();
  return path.join(appRoot, ...segments);
}

let dbApi = null;
async function loadDbApi() {
  // 1) Önce tek giriş noktası (index.cjs) varsa onu yükle
  const idx = resolveFromAppRoot("shared-db", "index.cjs");
  if (fs.existsSync(idx)) {
    dbApi = await importESM(idx);
    return;
  }
  // 2) Tek tek modülleri yükle (pakete girmişse)
  const dbJs          = resolveFromAppRoot("shared-db", "db.js");
  const productsJs    = resolveFromAppRoot("shared-db", "repositories", "productsRepo.js");
  const salesJs       = resolveFromAppRoot("shared-db", "repositories", "salesRepo.js");
  const settingsJs    = resolveFromAppRoot("shared-db", "repositories", "settingsRepo.js");
  const reportsJs     = resolveFromAppRoot("shared-db", "repositories", "reportsRepo.js");

  // Yoksa net hata göster
  const missing = [dbJs, productsJs, salesJs, settingsJs, reportsJs].filter(p => !fs.existsSync(p));
  if (missing.length) {
    throw new Error("shared-db paketlenmemiş. Eksik dosyalar:\n" + missing.join("\n"));
  }

  const openDbMod    = await importESM(dbJs);
  const productsRepo = await importESM(productsJs);
  const salesRepo    = await importESM(salesJs);
  const settingsRepo = await importESM(settingsJs);
  const reports      = await importESM(reportsJs);
  dbApi = {
    openDb: openDbMod.openDb || openDbMod.default || openDbMod,
    productsRepo: productsRepo.default || productsRepo,
    salesRepo: salesRepo.default || salesRepo,
    settingsRepo: settingsRepo.default || settingsRepo,
    reports: reports.default || reports
  };
}

let win, db;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.once("ready-to-show", () => { win.show(); win.focus(); });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // prod: dist/index.html (asar içinde)
    win.loadFile(resolveFromAppRoot("dist", "index.html"));
  }
}

app.whenReady().then(async () => {
  try {
    await loadDbApi();

    // DB dizini: userData (Windows: %APPDATA%\EMR POS)
    const dataDir = app.getPath("userData");
    fs.mkdirSync(path.join(dataDir, "data"), { recursive: true }); // garanti olsun

    db = dbApi.openDb(dataDir); // shared-db/db.js bunu kullanıyor olmalı
    createWindow();
  } catch (err) {
    console.error(err);
    dialog.showErrorBox("Başlatma Hatası", String(err?.stack || err));
    app.quit();
  }
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ---------- IPC ----------
ipcMain.handle("db:products:list", () => dbApi.productsRepo.list(db));
ipcMain.handle("db:products:findByBarcode", (e, barcode) => dbApi.productsRepo.findByBarcode(db, barcode));
ipcMain.handle("db:products:insert", (e, product) => dbApi.productsRepo.insert(db, product));

ipcMain.handle("db:sales:create", (e, payload) => dbApi.salesRepo.create(db, payload));

ipcMain.handle("db:settings:get", (e, key) => dbApi.settingsRepo.get(db, key));
ipcMain.handle("db:settings:set", (e, { key, value }) => dbApi.settingsRepo.set(db, key, value));

ipcMain.handle("report:summary", (e, { start, end }) => dbApi.reports.getSummary(db, start, end));

ipcMain.handle("system:getPrinters", () => win.webContents.getPrinters());
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

process.on("unhandledRejection", e => console.error(e));
process.on("uncaughtException", e => console.error(e));
