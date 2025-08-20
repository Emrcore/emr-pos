// electron/main.cjs
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { openDb } = require("../shared-db/db.js");
const productsRepo = require("../shared-db/repositories/productsRepo.js");
const salesRepo = require("../shared-db/repositories/salesRepo.js");
const settingsRepo = require("../shared-db/repositories/settingsRepo.js");
const reports = require("../shared-db/repositories/reportsRepo.js");

let win, db;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "bottom" });
  } else {
    win.loadFile(path.join(__dirname, "../index.html"));
  }
}

app.whenReady().then(() => {
  const appDataDir = path.join(app.getPath("appData"), "emr-pos");
  db = openDb(appDataDir);
  createWindow();
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ---------- IPC ----------
ipcMain.handle("db:products:list", () => productsRepo.list(db));
ipcMain.handle("db:products:findByBarcode", (e, barcode) => productsRepo.findByBarcode(db, barcode));
ipcMain.handle("db:products:insert", (e, product) => productsRepo.insert(db, product));

ipcMain.handle("db:sales:create", (e, payload) => salesRepo.create(db, payload));

ipcMain.handle("db:settings:get", (e, key) => settingsRepo.get(db, key));
ipcMain.handle("db:settings:set", (e, { key, value }) => settingsRepo.set(db, key, value));

ipcMain.handle("report:summary", (e, { start, end }) => reports.getSummary(db, start, end));

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
