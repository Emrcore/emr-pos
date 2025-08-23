// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const toFileUrl = (p) => pathToFileURL(p).href;
const importESM = (p) => import(toFileUrl(p));
const normMod = (m) => (m && m.default) ? m.default : m;

function normalizeDbApi(apiRaw) {
  const api = { ...apiRaw };

  // openDb hem named hem default olabilir
  api.openDb = api.openDb?.bind(api) || api.openDb || apiRaw;

  // repo modüllerini düzleştir
  api.productsRepo = normMod(api.productsRepo);
  api.salesRepo    = normMod(api.salesRepo);
  api.settingsRepo = normMod(api.settingsRepo);
  api.reports      = normMod(api.reports);

  // settings: get / set alias’larını garanti et
  const getFn = api.settingsRepo.get || api.settingsRepo.getSetting;
  const setFn = api.settingsRepo.set || api.settingsRepo.setSetting;
  if (!getFn || !setFn) {
    throw new Error("settingsRepo içinde get/getSetting ya da set/setSetting bulunamadı");
  }
  api.settingsRepo = { ...api.settingsRepo, get: getFn, set: setFn };

  return api;
}

// shared-db’yi iki konumdan biri üzerinden yükle
async function loadDbApi() {
  const candidates = [
    path.join(process.resourcesPath, "shared-db", "index.cjs"),
    path.join(__dirname, "..", "shared-db", "index.cjs"),
  ];
  const tried = [];

  // 1) index.cjs
  for (const idx of candidates) {
    try {
      console.log("[emr-pos] ESM yükleme deneniyor:", idx);
      const mod = normMod(await importESM(idx));
      if (mod && (mod.openDb || mod.default)) return normalizeDbApi(mod);
    } catch (e) { tried.push(`${idx} -> ${e.message}`); }
  }

  // 2) Tek tek modüller
  const roots = [
    path.join(process.resourcesPath, "shared-db"),
    path.join(__dirname, "..", "shared-db"),
  ];
  for (const root of roots) {
    try {
      console.log("[emr-pos] Modül kökü deneniyor:", root);
      const openDbMod    = normMod(await importESM(path.join(root, "db.js")));
      const productsRepo = normMod(await importESM(path.join(root, "repositories/productsRepo.js")));
      const salesRepo    = normMod(await importESM(path.join(root, "repositories/salesRepo.js")));
      const settingsRepo = normMod(await importESM(path.join(root, "repositories/settingsRepo.js")));
      const reports      = normMod(await importESM(path.join(root, "repositories/reportsRepo.js")));
      return normalizeDbApi({
        openDb: openDbMod.openDb || openDbMod,
        productsRepo,
        salesRepo,
        settingsRepo,
        reports,
      });
    } catch (e) { tried.push(`${root} -> ${e.message}`); }
  }

  throw new Error("shared-db yüklenemedi:\n" + tried.map(s => " - " + s).join("\n"));
}

let win, db, dbApi;

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
    console.log("[emr-pos] userData:", dataDir);

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
process.on("uncaughtException", (e) => { console.error(e); });
