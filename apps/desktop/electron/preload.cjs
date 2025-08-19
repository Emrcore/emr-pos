// electron/preload.cjs  (CommonJS)
const { contextBridge, ipcRenderer } = require('electron');

// Renderer'da window.electronAPI üzerinden çağıracağız
contextBridge.exposeInMainWorld('electronAPI', {
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', { key, value }),
  // gerekirse ek API’ler:
  // ping: () => ipcRenderer.invoke('ping'),
});
