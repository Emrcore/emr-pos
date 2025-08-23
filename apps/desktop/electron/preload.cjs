// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

// Tek noktadan API
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

  // SİSTEM
  system: {
    getPrinters: () => ipcRenderer.invoke("system:getPrinters"),
    printReceipt: (data) => ipcRenderer.invoke("print:receipt", data),
  },

  // GERİYE DÖNÜK: eski bundle 'getSetting' bekliyor
  getSetting: (key) => ipcRenderer.invoke("db:settings:get", key),
  setSetting: (key, value) => ipcRenderer.invoke("db:settings:set", { key, value }),
};

// Preload çalıştığını logla
console.log("[preload] exposing window.api");

// contextBridge ile ana dünyaya ver
try {
  contextBridge.exposeInMainWorld("api", api);
} catch (e) {
  console.error("[preload] exposeInMainWorld hata:", e);
}

// Ek güvenlik: bazı bundler’lar farklı isimler bekleyebiliyor.
// Aynı nesneyi alternatif isimlerle de (read-only) verelim.
try { contextBridge.exposeInMainWorld("electronAPI", api); } catch {}
try { contextBridge.exposeInMainWorld("electron",    api); } catch {}

// Son çare: DOM yüklendikten hemen sonra window.api yoksa at
window.addEventListener("DOMContentLoaded", () => {
  if (!window.api) {
    // eslint-disable-next-line no-undef
    globalThis.api = api;
    // eslint-disable-next-line no-undef
    globalThis.electronAPI = api;
    // eslint-disable-next-line no-undef
    globalThis.electron = api;
    console.warn("[preload] window.api yoktu, globalThis üzerinden eklendi.");
  }
});
