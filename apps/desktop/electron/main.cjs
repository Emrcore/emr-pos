// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const toURL = (p) => pathToFileURL(p).href;
const importESM = (p) => import(toURL(p));

let win, db, dbApi;

async function loadDbApi() {
  const tried = [];
  const tryOne = async (p) => {
    try {
      if (!fs.existsSync(p)) { tried.push(`yok: ${p}`); return null; }
      const m = await importESM(p);
      return m.default ?? m;
    } catch (e) {
      tried.push(`${p} -> ${e.message}`);
      return null;
    }
  };

  // 1) Asar dışına extraResources ile kopyalanmış klasör
  const outside = path.join(process.resourcesPath, "shared-db", "index.js");
  const m1 = await tryOne(outside);
  if (m1) return m1;

  // 2) Geliştirme / lokal
  const local = path.join(__dirname, "..", "shared-db", "index.js");
  const m2 = await tryOne(local);
  if (m2) return m2;

  // 3) Eski isimler (mjs) için fallback
  const outsideM = path.join(process.resourcesPath, "shared-db", "index.mjs");
  const localM   = path.join(__dirname, "..", "shared-db", "index.mjs");
  const m3 = await tryOne(outsideM) || await tryOne(localM);
  if (m3) return m3;

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
      dialog.showErrorBox("Başlatma Hatası", "dist/index.html bulunamadı:\n" + indexPath);
      app.quit(); return;
    }
    win.loadFile(indexPath);
  }
}

app.whenReady().then(async () => {
  try {
    dbApi = await loadDbApi();
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

// IPC
ipcMain.handle("db:products:list", () => dbApi.productsRepo.list(db));
ipcMain.handle("db:products:findByBarcode", (e, barcode) => dbApi.productsRepo.findByBarcode(db, barcode));
ipcMain.handle("db:products:insert", (e, product) => dbApi.productsRepo.insert(db, product));
ipcMain.handle("db:sales:create", (e, payload) => dbApi.salesRepo.create(db, payload));
ipcMain.handle("db:settings:get", (e, key) => dbApi.settingsRepo.get(db, key));
ipcMain.handle("db:settings:set", (e, { key, value }) => dbApi.settingsRepo.set(db, key, value));
ipcMain.handle("report:summary", (e, { start, end }) => dbApi.reports.getSummary(db, start, end));
