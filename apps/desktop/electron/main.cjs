// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let win, db, dbApi;

function loadDbApi() {
  // Asar içi ve dışı olasılıkları sırayla dene
  const candidates = [
    // üretimde (__dirname -> resources/app.asar/electron)
    path.join(__dirname, "..", "shared-db", "index.cjs"),
    // bazen extraResources ile kopyalanırsa:
    path.join(process.resourcesPath, "shared-db", "index.cjs"),
    // geliştirme ortamı (repo kökü)
    path.join(process.cwd(), "shared-db", "index.cjs"),
  ];

  const tried = [];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        // CJS köprümüz: require yeterli
        // eslint-disable-next-line import/no-dynamic-require, global-require
        const mod = require(p);
        return mod;
      }
      tried.push(`yok: ${p}`);
    } catch (e) {
      tried.push(`${p} -> ${e.message}`);
    }
  }
  throw new Error("shared-db yüklenemedi:\n" + tried.map(s => " - " + s).join("\n"));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => { win.show(); win.focus(); });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    if (!fs.existsSync(indexPath)) {
      const msg = "dist/index.html bulunamadı: " + indexPath;
      console.error("[emr-pos]", msg);
      dialog.showErrorBox("Başlatma Hatası", msg);
      app.quit(); return;
    }
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  try {
    dbApi = loadDbApi();
    const dataDir = app.getPath("userData");
    db = dbApi.openDb(dataDir);
    createWindow();
  } catch (err) {
    console.error("[emr-pos] Başlatma hatası:", err);
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
process.on("uncaughtException",  (e) => { console.error(e); });
