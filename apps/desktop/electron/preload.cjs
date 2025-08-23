// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

const api = {
  // ÜRÜNLER
  products: {
    list: () => ipcRenderer.invoke("db:products:list"),
    findByBarcode: (barcode) => ipcRenderer.invoke("db:products:findByBarcode", barcode),
    insert: (product) => ipcRenderer.invoke("db:products:insert", product),
  },

  // SATIŞ
  sales: {
    create: (payload) => ipcRenderer.invoke("db:sales:create", payload),
  },

  // AYARLAR
  settings: {
    get: (key) => ipcRenderer.invoke("db:settings:get", key),
    set: (key, value) => ipcRenderer.invoke("db:settings:set", { key, value }),
  },

  // RAPOR
  reports: {
    summary: ({ start, end }) => ipcRenderer.invoke("report:summary", { start, end }),
  },

  // ESKİ ADLAR (geriye dönük)
  getSetting: (key) => ipcRenderer.invoke("db:settings:get", key),
  setSetting: (key, value) => ipcRenderer.invoke("db:settings:set", { key, value }),
};

// Modern isim
contextBridge.exposeInMainWorld("api", api);

// Eski isimleri bekleyen bundle’lar için uyumluluk katmanı
const electronAPI = {
  listProducts: () => ipcRenderer.invoke("db:products:list"),
  findProductByBarcode: (barcode) => ipcRenderer.invoke("db:products:findByBarcode", barcode),
  insertProduct: (product) => ipcRenderer.invoke("db:products:insert", product),
  getSetting: (key) => ipcRenderer.invoke("db:settings:get", key),
  setSetting: (key, value) => ipcRenderer.invoke("db:settings:set", { key, value }),
  summaryReport: (range) => ipcRenderer.invoke("report:summary", range),
  getPrinters: () => ipcRenderer.invoke("system:getPrinters"),
  printReceipt: (data) => ipcRenderer.invoke("print:receipt", data),
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

// Konsol bilgi
try {
  if (!globalThis.api) {
    globalThis.api = api;
    console.log("[preload] window.api yoktu, globalThis üzerinden eklendi.");
  }
  if (!globalThis.electronAPI) {
    globalThis.electronAPI = electronAPI;
    console.log("[preload] window.electronAPI yoktu, globalThis üzerinden eklendi.");
  }
  console.log("[preload] exposing window.api");
} catch {}
