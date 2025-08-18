import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // DB: Products
  listProducts: () => ipcRenderer.invoke("db:products:list"),
  findProductByBarcode: (barcode) => ipcRenderer.invoke("db:products:findByBarcode", barcode),
  insertProduct: (product) => ipcRenderer.invoke("db:products:insert", product),

  // DB: Sales
  createSale: (sale) => ipcRenderer.invoke("db:sales:create", sale),

  // DB: Settings
  getSetting: (key) => ipcRenderer.invoke("db:settings:get", key),
  setSetting: (key, value) => ipcRenderer.invoke("db:settings:set", { key, value }),

  // Reports
  reportSummary: (range) => ipcRenderer.invoke("report:summary", range),

  // System
  getPrinters: () => ipcRenderer.invoke("system:getPrinters"),
  printReceipt: (data) => ipcRenderer.invoke("print:receipt", data),
});
