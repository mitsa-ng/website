import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

process.env.DIST_ELECTRON = path.join(__dirname)
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

let win: BrowserWindow | null

ipcMain.handle('api-fetch', async (_event, url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: options?.headers as Record<string, string> | undefined,
      body: options?.body as string | undefined,
    })
    const text = await res.text()
    return {
      ok: res.ok,
      status: res.status,
      text,
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      text: err.message || 'Network error',
    }
  }
})

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }

  win.on('closed', () => { win = null })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
