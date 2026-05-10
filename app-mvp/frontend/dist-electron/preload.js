import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { contextBridge, ipcRenderer } = require('electron');
const api = {
    openDirectory: async () => ipcRenderer.invoke('dialog:openDirectory'),
    openFiles: async () => ipcRenderer.invoke('dialog:openFiles'),
    getConfig: async () => ipcRenderer.invoke('config:get'),
    setConfig: async (cfg) => ipcRenderer.invoke('config:set', cfg),
};
contextBridge.exposeInMainWorld('desktop', api);
