// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

function toFileUrl(p) { return pathToFileURL(p).href; }
async function tryImport(p) { return import(toFileUrl(p)); }
function tryRequire(p) { return require(p); }

async function loadDbApi() {
  // Aranacak dizin + dosya adayları
  const roots = [
    // asar içi
    path.join(__dirname, "..", "shared-db"),
    // asar dışına kopyalandıysa
    path.join(process.resourcesPath, "shared-db"),
    // olası çalışma dizini
    path.join(process.cwd(), "shared-db"),
  ];
  const files = ["index.mjs", "index.js", "index.cjs"];

  const tried = [];

  // 1) index.* dene (önce import(), sonra require)
  for (const r of roots) {
    for (const f of files) {
      const p = path.join(r, f);
      if (!fs.existsSync(p)) { tried.push(`yok: ${p}`); continue; }
      try {
        const mod = await tryImport(p).catch(() => null) || tryRequire(p);
        return mod && (mod.default || mod);
      } catch (e) {
        tried.push(`${p} -> ${e.message}`);
      }
    }
  }

  // 2) index yoksa tek tek modülleri import et (import() ile)
  for (const r of roots) {
    const paths = {
      db: path.join(r, "db.js"),
      products: path.join(r, "repositories", "productsRepo.js"),
      sales: path.join(r, "repositories", "salesRepo.js"),
      settings: path.join(r, "repositories", "settingsRepo.js"),
      reports: path.join(r, "repositories", "reportsRepo.js"),
    };
    try {
      for (const k of Object.values(paths)) if (!fs.existsSync(k)) throw new Error(`yok: ${k}`);
      const openDbMod    = await tryImport(paths.db);
      const productsRepo = await tryImport(paths.products);
      const salesRepo    = await tryImport(paths.sales);
      const settingsRepo = await tryImport(paths.settings);
      const reports      = await tryImport(paths.reports);
      return {
        openDb: openDbMod.openDb || openDbMod.default || openDbMod,
        productsRepo: productsRepo.default || productsRepo,
        salesRepo:    salesRepo.default    || salesRepo,
        settingsRepo: settingsRepo.default || settingsRepo,
        reports:      reports.default      || reports,
      };
    } catch (e) {
      tried.push(`${r} (tek tek) -> ${e.message}`);
    }
  }

  throw new Error("shared-db yüklenemedi:\n" + tried.map(s => " - " + s).join("\n"));
}

let win = null;
let db = null;
let dbApi = null;

function registerIpc() {
  if (!dbApi || !db) throw new Error("IPC için DB hazır değil");
  try { dbApi.db = db; } catch {}

  ipcMain.handle("db:products:list", () => dbApi.productsRepo.list(db));
  ipcMain.handle("db:products:findByBarcode", (_e, barcode) => dbApi.productsRepo.findByBarcode(db, barcode));
  ipcMain.handle("db:products:insert", (_e, product) => dbApi.productsRepo.insert(db, product));

  ipcMain.handle("db:sales:create", (_e, payload) => dbApi.salesRepo.create(db, payload));

  ipcMain.handle("db:settings:get", (_e, key) => dbApi.settingsRepo.get(db, key));
  ipcMain.handle("db:settings:set", (_e, { key, value }) => dbApi.settingsRepo.set(db, key, value));

  ipcMain.handle("report:summary", (_e, { start, end }) => dbApi.reports.getSummary(db, start, end));

  ipcMain.handle("system:getPrinters", () => win.webContents.getPrinters());
  ipcMain.handle("print:receipt", async (_e, data) => {
    const p = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    const html = buildReceiptHTML(data);
    await p.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
    await p.webContents.print({ silent: false, printBackground: true });
    p.close();
  });
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
    console.log("[emr-pos] loadFile:", indexPath);
    win.loadFile(indexPath);
  }
}

app.whenReady().then(async () => {
  try {
    dbApi = await loadDbApi();
    const dataDir = app.getPath("userData");
    db = dbApi.openDb(dataDir);

    // **ÖNCE** IPC, **SONRA** pencere
    registerIpc();
    createWindow();
  } catch (err) {
    console.error("[emr-pos] Başlatma hatası:", err);
    dialog.showErrorBox("Başlatma Hatası", String(err?.stack || err));
    app.quit();
  }
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

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
