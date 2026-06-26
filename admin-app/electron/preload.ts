import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  apiFetch: (url: string, options?: RequestInit) =>
    ipcRenderer.invoke('api-fetch', url, options),
})
