import { app, BrowserWindow, ipcMain, shell } from 'electron'
import http from 'node:http'
import crypto from 'node:crypto'
import path from 'node:path'

// Public OAuth desktop client (no secret); Google Cloud project web-admin-509822.
const GOOGLE_CLIENT_ID = '889416753740-t1ej4q4onhid21hju7urt8mufb1eslse.apps.googleusercontent.com'
// Public desktop client; Google requires the (non-confidential) secret in token exchanges.
const GOOGLE_CLIENT_SECRET = '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'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly'
const LOOPBACK_PORT = 18497

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

async function exchangeToken(body: Record<string, string>) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const tokens = await res.json()
  if (!res.ok || !tokens.access_token) {
    throw new Error(tokens.error_description || 'token exchange failed')
  }
  return tokens
}

let activeAuthServer: http.Server | null = null

ipcMain.handle('google-auth', async () => {
  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `http://127.0.0.1:${LOOPBACK_PORT}`
  const authUrl = GOOGLE_AUTH_URL + '?' + new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  // A leaked server from a cancelled attempt would hold the port forever,
  // because close() alone does not terminate keep-alive sockets.
  if (activeAuthServer) {
    activeAuthServer.closeAllConnections?.()
    activeAuthServer.close()
    activeAuthServer = null
  }

  const code = await new Promise<string>((resolve, reject) => {
    const finish = (fn: () => void) => {
      clearTimeout(timeout)
      if (server) {
        server.closeAllConnections?.()
        server.close()
      }
      if (activeAuthServer === server) activeAuthServer = null
      fn()
    }
    let server: http.Server | null = null
    const timeout = setTimeout(() => {
      finish(() => reject(new Error('authorization timed out')))
    }, 300_000)
    server = http.createServer((req, res) => {
      const u = new URL(req.url || '/', redirectUri)
      const code = u.searchParams.get('code')
      if (code && u.searchParams.get('state') === state) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Connection': 'close' })
        res.end('<html><body style="font-family:system-ui;text-align:center;padding:60px"><h2>&#10003; OK</h2><p>Personal Web Admin</p><script>setTimeout(()=>window.close(),3000)</script></body></html>')
        finish(() => resolve(code))
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain', 'Connection': 'close' })
        res.end('authorization cancelled')
        finish(() => reject(new Error('authorization cancelled')))
      }
    })
    server.on('error', (err) => {
      finish(() => reject(err))
    })
    activeAuthServer = server
    server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
      shell.openExternal(authUrl)
    })
  })

  const tokens = await exchangeToken({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })
  return {
    refreshToken: tokens.refresh_token as string | undefined,
    accessToken: tokens.access_token as string,
    expiresAt: Date.now() + ((tokens.expires_in as number) || 3600) * 1000,
  }
})

ipcMain.handle('google-refresh', async (_event, refreshToken: string) => {
  const tokens = await exchangeToken({
    refresh_token: refreshToken,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
  })
  return {
    accessToken: tokens.access_token as string,
    expiresAt: Date.now() + ((tokens.expires_in as number) || 3600) * 1000,
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
