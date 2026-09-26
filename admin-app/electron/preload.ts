import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  apiFetch: (url: string, options?: RequestInit) =>
    ipcRenderer.invoke('api-fetch', url, options),
  googleAuth: () => ipcRenderer.invoke('google-auth'),
  googleRefresh: (refreshToken: string) => ipcRenderer.invoke('google-refresh', refreshToken),
})
