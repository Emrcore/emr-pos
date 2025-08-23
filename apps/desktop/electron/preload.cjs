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

  // SİSTEM
  system: {
    getPrinters: () => ipcRenderer.invoke("system:getPrinters"),
    printReceipt: (data) => ipcRenderer.invoke("print:receipt", data),
  },

  // --- GERİYE DÖNÜK UYUMLULUK (renderer eski adları kullanıyorsa) ---
  getSetting: (key) => ipcRenderer.invoke("db:settings:get", key),
  setSetting: (key, value) => ipcRenderer.invoke("db:settings:set", { key, value }),
};

contextBridge.exposeInMainWorld("api", api);
