// electron/preload.cjs
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/** Ana API: ana süreçte tanımlı IPC kanallarına bire bir karşılık gelir */
const api = {
  // ÜRÜNLER
  products: {
    list:          ()             => ipcRenderer.invoke('db:products:list'),
    findByBarcode: (barcode)      => ipcRenderer.invoke('db:products:findByBarcode', barcode),
    insert:        (product)      => ipcRenderer.invoke('db:products:insert', product),
  },

  // SATIŞ
  sales: {
    create:        (payload)      => ipcRenderer.invoke('db:sales:create', payload),
  },

  // AYARLAR
  settings: {
    get:           (key)          => ipcRenderer.invoke('db:settings:get', key),
    set:           (key, value)   => ipcRenderer.invoke('db:settings:set', { key, value }),
  },

  // RAPOR
  reports: {
    summary:       ({ start, end }) => ipcRenderer.invoke('report:summary', { start, end }),
  },

  // SİSTEM
  system: {
    // Electron 30+ için async olanı deneyip yoksa sync’e düş
    getPrinters: async () => {
      if (typeof ipcRenderer.invoke !== 'function') return [];
      // ana süreçte biz zaten getPrintersAsync kullanıyoruz; yine de geriye dönük için isim aynı
      return ipcRenderer.invoke('system:getPrinters');
    },
    printReceipt: (data) => ipcRenderer.invoke('print:receipt', data),
  },
};

/** Eski bundle uyumluluğu: window.electronAPI altında kopya metodlar */
const electronAPI = {
  // sistem
  printReceipt:  api.system.printReceipt,
  getPrinters:   api.system.getPrinters,
  listPrinters:  api.system.getPrinters, // bazı eski kodlar bu adı kullanıyor

  // rapor
  reportSummary: api.reports.summary,

  // ürün
  listProducts:  api.products.list,
  findByBarcode: api.products.findByBarcode,
  insertProduct: api.products.insert,

  // ayarlar (eski çağrılar bunları bekliyor olabilir)
  getSetting:    api.settings.get,
  setSetting:    api.settings.set,
};

/** Güvenli expose (contextIsolation açıkken çalışır; olmazsa global’e yazar) */
function safeExpose(name, value) {
  try {
    contextBridge.exposeInMainWorld(name, value);
    // Tanı amaçlı küçük log
    try { console.log(`[preload] exposed ${name} via contextBridge`); } catch {}
  } catch (err) {
    // Çok nadiren contextBridge hata verirse, global’e yaz
    try {
      globalThis[name] = value;
      console.warn(`[preload] contextBridge failed, set ${name} on globalThis.`, err && err.message);
    } catch (e2) {
      // hiçbiri olmazsa sessiz geç
    }
  }
}

safeExpose('api', api);
safeExpose('electronAPI', electronAPI);
