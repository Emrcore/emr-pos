// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

// Ana API (isimler ana süreçteki IPC kanallarıyla bire bir)
const api = {
  // ÜRÜNLER
  products: {
    list:           ()            => ipcRenderer.invoke("db:products:list"),
    findByBarcode:  (barcode)     => ipcRenderer.invoke("db:products:findByBarcode", barcode),
    insert:         (product)     => ipcRenderer.invoke("db:products:insert", product),
  },

  // SATIŞ
  sales: {
    create:         (payload)     => ipcRenderer.invoke("db:sales:create", payload),
  },

  // AYARLAR
  settings: {
    get:            (key)         => ipcRenderer.invoke("db:settings:get", key),
    set:            (key, value)  => ipcRenderer.invoke("db:settings:set", { key, value }),
  },

  // RAPOR
  reports: {
    summary:        ({ start, end }) => ipcRenderer.invoke("report:summary", { start, end }),
  },

  // SİSTEM
  system: {
    getPrinters:    ()            => ipcRenderer.invoke("system:getPrinters"),
    printReceipt:   (data)        => ipcRenderer.invoke("print:receipt", data),
  },
};

// Modern ad: window.api
contextBridge.exposeInMainWorld("api", api);

// Geriye dönük uyumluluk: window.electronAPI.* (eski bundle’ın beklediği isimler)
const electronAPI = {
  // sistem
  printReceipt:   api.system.printReceipt,
  getPrinters:    api.system.getPrinters,
  listPrinters:   api.system.getPrinters,   // bazı eski kodlar bu ismi kullanıyor olabilir

  // rapor
  reportSummary:  api.reports.summary,

  // ürün
  listProducts:   api.products.list,
  findByBarcode:  api.products.findByBarcode,
  insertProduct:  api.products.insert,

  // ayarlar
  getSetting:     api.settings.get,
  setSetting:     api.settings.set,
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

// Tanı amaçlı küçük log
try { console.log("[preload] exposing window.api & window.electronAPI"); } catch {}
