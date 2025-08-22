// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

// ---- ESM modülleri (shared-db) güvenli import helper'ı
async function importESM(filePath) {
  // Windows'ta C:\... gibi yolları file:// URL'ye çevir
  const url = pathToFileURL(filePath).href;
  return import(url);
}

// paylaşılan DB API'lerini dinamik yükle (ESM)
let dbApi = null;
async function loadDbApi() {
  // ihtiyacınıza göre: tek bir index.cjs kullanıyorsanız onu import edin
  // yoksa tek tek modülleri import edip bir araya getirin.
  //
  // 1) TERCİH: apps/desktop/shared-db/index.cjs varsa:
  const idx = path.join(__dirname, "../shared-db/index.cjs");
  try {
    dbApi = await importESM(idx);
    // dbApi: { openDb, productsRepo, salesRepo, settingsRepo, reports }
    return;
  } catch (_) {
    // 2) Alternatif: tek tek dosyalar (Eğer index.cjs yoksa)
    const openDbMod     = await importESM(path.join(__dirname, "../shared-db/db.js"));
    const productsRepo  = await importESM(path.join(__dirname, "../shared-db/repositories/productsRepo.js"));
    const salesRepo     = await importESM(path.join(__dirname, "../shared-db/repositories/salesRepo.js"));
    const settingsRepo  = await importESM(path.join(__dirname, "../shared-db/repositories/settingsRepo.js"));
    const reports       = await importESM(path.join(__dirname, "../shared-db/repositories/reportsRepo.js"));

    dbApi = {
      openDb: openDbMod.openDb || openDbMod.default || openDbMod,
      productsRepo: productsRepo.default || productsRepo,
      salesRepo: salesRepo.default || salesRepo,
      settingsRepo: settingsRepo.default || settingsRepo,
      reports: reports.default || reports
    };
  }
}

let win;
let db;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // önce hazır olunca gösterelim
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    // DevTools istersen aç
    // win.webContents.openDevTools({ mode: "bottom" });
  } else {
    win.loadFile(path.join(__dirname, "../index.html"));
  }
}

app.whenReady().then(async () => {
  try {
    await loadDbApi(); // ESM modülleri yüklemeden pencere yaratma
    const appDataDir = path.join(app.getPath("appData"), "emr-pos");
    db = dbApi.openDb(appDataDir);
    createWindow();
  } catch (err) {
    console.error("DB API yüklenirken hata:", err);
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

// ---- Global hata yakalama (arka planda kalma sorunlarını görünür yapar)
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
  dialog.showErrorBox("Beklenmeyen Hata", String(reason?.stack || reason));
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
  dialog.showErrorBox("Beklenmeyen Hata", String(err?.stack || err));
});
