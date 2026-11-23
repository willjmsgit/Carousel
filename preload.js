const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  saveFiles: (files) => ipcRenderer.invoke('save-files', files),
});
