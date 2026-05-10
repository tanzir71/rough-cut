import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron')

const api = {
  openDirectory: async (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  openFiles: async (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  getConfig: async (): Promise<{ llmMode: 'LOCAL_ONLY' | 'OPENROUTER_ONLY' | 'LOCAL_FIRST'; openrouterApiKey?: string }> =>
    ipcRenderer.invoke('config:get'),
  setConfig: async (cfg: { llmMode: 'LOCAL_ONLY' | 'OPENROUTER_ONLY' | 'LOCAL_FIRST'; openrouterApiKey?: string }) =>
    ipcRenderer.invoke('config:set', cfg),
}

contextBridge.exposeInMainWorld('desktop', api)

export type DesktopApi = typeof api

