// electron/main.cjs
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// CJS wrapper
const { openDb } = require("../shared-db/index.cjs");

// Repositories (CJS olduklarından emin olun)
const productsRepo = require("../shared-db/repositories/productsRepo.cjs");
const salesRepo    = require("../shared-db/repositories/salesRepo.cjs");
const settingsRepo = require("../shared-db/repositories/settingsRepo.cjs");
const reports      = require("../shared-db/repositories/reportsRepo.cjs");

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
    // renderer build çıktısı
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  // openDb() argümansız çağrılırsa userData altında emr-pos.sqlite yaratır
  db = openDb();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/* ---------------- IPC ---------------- */

ipcMain.handle("db:products:list", () => productsRepo.list(db));
ipcMain.handle("db:products:findByBarcode", (_e, barcode) => productsRepo.findByBarcode(db, barcode));
ipcMain.handle("db:products:insert", (_e, product) => productsRepo.insert(db, product));

ipcMain.handle("db:sales:create", (_e, payload) => salesRepo.create(db, payload));

ipcMain.handle("db:settings:get", (_e, key) => settingsRepo.get(db, key));
ipcMain.handle("db:settings:set", (_e, { key, value }) => settingsRepo.set(db, key, value));

ipcMain.handle("report:summary", (_e, { start, end }) => reports.getSummary(db, start, end));

ipcMain.handle("system:getPrinters", () => (win ? win.webContents.getPrinters() : []));

ipcMain.handle("print:receipt", async (_e, data) => {
  const p = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  const html = buildReceiptHTML(data);
  await p.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
  await p.webContents.print({ silent: false, printBackground: true });
  p.close();
});

function buildReceiptHTML(data) {
  const esc = (s = "") => String(s).replace(/[&<>"']/g, m =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])
  );

  const items = (data.items || [])
    .map(i => `
      <tr>
        <td>${esc(i.name)}</td>
        <td style="text-align:right">${esc(i.qty)}</td>
        <td style="text-align:right">${esc(i.unit)}</td>
        <td style="text-align:right">${esc(i.total)}</td>
      </tr>`)
    .join("");

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
    <h3>${esc(data.header?.title || "EMR POS")}</h3>
    <h4>${esc(data.header?.date || "")}</h4>
    <table>${items}</table>
    <hr/>
    <table>
      <tr><td>Ara Toplam</td><td style="text-align:right">${esc(data.summary?.subtotal ?? "")}</td></tr>
      <tr><td>KDV</td><td style="text-align:right">${esc(data.summary?.vat ?? "")}</td></tr>
      <tr><td><b>TOPLAM</b></td><td style="text-align:right"><b>${esc(data.summary?.total ?? "")}</b></td></tr>
      <tr><td>Ödeme</td><td style="text-align:right">${esc(data.summary?.payment ?? "")}</td></tr>
    </table>
    <p style="text-align:center">${esc(data.footer || "Teşekkür ederiz")}</p>
  </body></html>`;
}
