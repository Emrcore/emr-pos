// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

const api = {
  // Yeni API
  products: {
    list: () => ipcRenderer.invoke("db:products:list"),
    findByBarcode: (barcode) => ipcRenderer.invoke("db:products:findByBarcode", barcode),
    insert: (product) => ipcRenderer.invoke("db:products:insert", product),
  },
  sales: {
    create: (payload) => ipcRenderer.invoke("db:sales:create", payload),
  },
  settings: {
    get: (key) => ipcRenderer.invoke("db:settings:get", key),
    set: (key, value) => ipcRenderer.invoke("db:settings:set", { key, value }),
  },
  reports: {
    summary: ({ start, end }) => ipcRenderer.invoke("report:summary", { start, end }),
  },
  system: {
    getPrinters: () => ipcRenderer.invoke("system:getPrinters"),
    printReceipt: (data) => ipcRenderer.invoke("print:receipt", data),
  },

  // --- GERİYE DÖNÜK UYUMLULUK (renderer eski adları kullanıyorsa) ---
  // bazı bundle’larda window.electronAPI.* ve düz fonksiyon isimleri bekleniyor
  listProducts: () => ipcRenderer.invoke("db:products:list"),
  findProductByBarcode: (barcode) => ipcRenderer.invoke("db:products:findByBarcode", barcode),
  insertProduct: (product) => ipcRenderer.invoke("db:products:insert", product),

  createSale: (payload) => ipcRenderer.invoke("db:sales:create", payload),

  getSetting: (key) => ipcRenderer.invoke("db:settings:get", key),
  setSetting: (key, value) => ipcRenderer.invoke("db:settings:set", { key, value }),

  reportSummary: ({ start, end }) => ipcRenderer.invoke("report:summary", { start, end }),

  getPrinters: () => ipcRenderer.invoke("system:getPrinters"),
  printReceiptLegacy: (data) => ipcRenderer.invoke("print:receipt", data),
};

// Hem window.api hem window.electronAPI olarak verelim
try {
  contextBridge.exposeInMainWorld("api", api);
  contextBridge.exposeInMainWorld("electronAPI", api);
} catch (_) {
  // contextIsolation=false ise fallback
  globalThis.api = api;
  globalThis.electronAPI = api;
}
