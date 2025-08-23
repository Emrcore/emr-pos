// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

function toFileUrl(p) { return pathToFileURL(p).href; }
async function dynImport(p) { return import(toFileUrl(p)); }

async function normalizeDbApi(mod) {
  // default veya named export yakala
  const m = mod?.default ? mod.default : mod;
  const openDb =
    m?.openDb || m?.db?.openDb || m?.default?.openDb || mod?.openDb;
  const productsRepo =
    m?.productsRepo || m?.repositories?.productsRepo || m?.default?.productsRepo;
  const salesRepo =
    m?.salesRepo || m?.repositories?.salesRepo || m?.default?.salesRepo;
  const settingsRepo =
    m?.settingsRepo || m?.repositories?.settingsRepo || m?.default?.settingsRepo;
  const reports =
    m?.reports || m?.repositories?.reports || m?.default?.reports;

  return { openDb, productsRepo, salesRepo, settingsRepo, reports };
}

async function loadDbApi() {
  const roots = [
    path.join(__dirname, "..", "shared-db"),           // asar içi
    path.join(process.resourcesPath, "shared-db"),     // asar dışı kopya (extraResources)
    path.join(process.cwd(), "shared-db"),             // dev olasılığı
  ];
  const files = ["index.mjs", "index.js", "index.cjs"];
  const tried = [];

  // 1) index.* ile tek seferde
  for (const r of roots) {
    for (const f of files) {
      const p = path.join(r, f);
      if (!fs.existsSync(p)) { tried.push(`yok: ${p}`); continue; }
      try {
        const mod = await dynImport(p);
        const api = await normalizeDbApi(mod);
        if (!api.openDb) throw new Error("openDb exportu bulunamadı");
        return api;
      } catch (e) {
        tried.push(`${p} -> ${e.message}`);
      }
    }
  }

  // 2) index yoksa tek tek modüller
  for (const r of roots) {
    try {
      const need = (rel) => {
        const p = path.join(r, rel);
        if (!fs.existsSync(p)) throw new Error(`yok: ${p}`);
        return p;
      };
      const dbP        = need("db.js");
      const prodP      = need("repositories/productsRepo.js");
      const salesP     = need("repositories/salesRepo.js");
      const settingsP  = need("repositories/settingsRepo.js");
      const reportsP   = need("repositories/reportsRepo.js");

      const dbMod       = await dynImport(dbP);
      const productsMod = await dynImport(prodP);
      const salesMod    = await dynImport(salesP);
      const settingsMod = await dynImport(settingsP);
      const reportsMod  = await dynImport(reportsP);

      const api = await normalizeDbApi({
        openDb: dbMod.openDb || dbMod.default?.openDb,
        productsRepo: productsMod.default || productsMod,
        salesRepo:    salesMod.default    || salesMod,
        settingsRepo: settingsMod.default || settingsMod,
        reports:      reportsMod.default  || reportsMod,
      });
      if (!api.openDb) throw new Error("openDb exportu bulunamadı (tek tek)");
      return api;
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
    if (!dbApi?.openDb) throw new Error("shared-db yüklendi ama openDb yok");

    const dataDir = app.getPath("userData");
    console.log("[emr-pos] userData:", dataDir);

    const maybeDb = dbApi.openDb(dataDir);
    db = (maybeDb && typeof maybeDb.then === "function") ? await maybeDb : maybeDb;

    if (!db || typeof db.prepare !== "function") {
      throw new Error("openDb geçerli bir DB nesnesi döndürmedi (prepare yok)");
    }

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
