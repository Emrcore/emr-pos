// apps/desktop/electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

// ESM modülleri (repo dosyaların .js ise ESM olabilir) dinamik import ile yükle
async function importESM(filePath) {
  return import(pathToFileURL(filePath).href);
}

let dbApi = null;
async function loadDbApi() {
  // Önce CJS db.js’i doğrudan require et (tercihen)
  const { openDb } = require("../shared-db/db.js");

  // Repos ESM ise dinamik import; CJS ise require deneyelim
  let productsRepo, salesRepo, settingsRepo, reports;

  try { productsRepo = require("../shared-db/repositories/productsRepo.js"); }
  catch { productsRepo = (await importESM(path.join(__dirname, "../shared-db/repositories/productsRepo.js"))).default; }

  try { salesRepo = require("../shared-db/repositories/salesRepo.js"); }
  catch { salesRepo = (await importESM(path.join(__dirname, "../shared-db/repositories/salesRepo.js"))).default; }

  try { settingsRepo = require("../shared-db/repositories/settingsRepo.js"); }
  catch { settingsRepo = (await importESM(path.join(__dirname, "../shared-db/repositories/settingsRepo.js"))).default; }

  try { reports = require("../shared-db/repositories/reportsRepo.js"); }
  catch { reports = (await importESM(path.join(__dirname, "../shared-db/repositories/reportsRepo.js"))).default; }

  dbApi = { openDb, productsRepo, salesRepo, settingsRepo, reports };
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
    win.loadFile(path.join(__dirname, "../index.html"));
  }
}

app.whenReady().then(async () => {
  try {
    await loadDbApi();

    // userData (Windows: C:\Users\<kullanıcı>\AppData\Roaming\EMR POS)
    const userDataDir = app.getPath("userData");
    db = dbApi.openDb(userDataDir);

    createWindow();
  } catch (err) {
    console.error("Başlatma Hatası:", err);
    dialog.showErrorBox("Başlatma Hatası", `SqliteError: ${err && err.message ? err.message : String(err)}`);
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

process.on("unhandledRejection", (r) => { console.error(r); });
process.on("uncaughtException", (e) => { console.error(e); });
