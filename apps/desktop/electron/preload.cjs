// apps/desktop/electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

// Tek noktadan doğru IPC kanallarına map'leyelim
const api = {
  settings: {
    get: (key) => ipcRenderer.invoke("db:settings:get", key),
    set: (key, value) => ipcRenderer.invoke("db:settings:set", { key, value }),
  },
  products: {
    list: () => ipcRenderer.invoke("db:products:list"),
    findByBarcode: (barcode) => ipcRenderer.invoke("db:products:findByBarcode", barcode),
    insert: (product) => ipcRenderer.invoke("db:products:insert", product),
  },
  sales: {
    create: (payload) => ipcRenderer.invoke("db:sales:create", payload),
  },
  report: {
    summary: ({ start, end }) => ipcRenderer.invoke("report:summary", { start, end }),
  },
  system: {
    getPrinters: () => ipcRenderer.invoke("system:getPrinters"),
    printReceipt: (data) => ipcRenderer.invoke("print:receipt", data),
  },
};

// contextIsolation açıkken güvenli köprü:
try {
  contextBridge.exposeInMainWorld("api", api);
} catch {
  // (Geliştirme esnasında contextIsolation kapalıysa)
  // eslint-disable-next-line no-undef
  window.api = api;
}
