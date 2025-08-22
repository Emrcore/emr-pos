const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("url");

function logLine(line) {
  try {
    const logDir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, "startup.log"), new Date().toISOString() + " " + line + "\n");
  } catch {}
}

async function importESM(filePath) {
  const url = pathToFileURL(filePath).href;
  return import(url);
}

let dbApi = null;
async function loadDbApi() {
  const idx = path.join(__dirname, "../shared-db/index.cjs");
  try {
    dbApi = await importESM(idx);
    return;
  } catch {}
  const openDbMod    = await importESM(path.join(__dirname, "../shared-db/db.js"));
  const productsRepo = await importESM(path.join(__dirname, "../shared-db/repositories/productsRepo.js"));
  const salesRepo    = await importESM(path.join(__dirname, "../shared-db/repositories/salesRepo.js"));
  const settingsRepo = await importESM(path.join(__dirname, "../shared-db/repositories/settingsRepo.js"));
  const reports      = await importESM(path.join(__dirname, "../shared-db/repositories/reportsRepo.js"));
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
    win.loadFile(path.join(__dirname, "../index.html"));
  }
}

app.whenReady().then(async () => {
  try {
    await loadDbApi();

    const userData = app.getPath("userData");
    const override = process.env.EMR_POS_DATA_DIR || "";
    logLine("userData=" + userData);
    if (override) logLine("override=" + override);

    db = dbApi.openDb(override || userData);
    logLine("DB open OK");

    createWindow();
  } catch (err) {
    logLine("DB open FAIL: " + (err && err.stack ? err.stack : err));
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

process.on("unhandledRejection", (r) => { console.error(r); });
process.on("uncaughtException", (e) => { console.error(e); });
