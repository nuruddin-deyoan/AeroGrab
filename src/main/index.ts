import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, normalize, dirname } from 'path'
import { statSync, existsSync, statfsSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { YtDlpManager } from './ytdlp'
import { StoreManager } from './store'

const VALID_QUALITIES = new Set(['best', '1080p', '720p', '480p', '360p', 'audio'])

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unit]}`
}

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let splashShownAt = 0
const ytdlp = new YtDlpManager()
const store = new StoreManager()

const SPLASH_DURATION = 2500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getWindowIcon(): string | undefined {
  try {
    const iconPath = join(app.getAppPath(), 'build', 'icon.ico')
    return existsSync(iconPath) ? iconPath : undefined
  } catch {
    return undefined
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 750,
    minHeight: 550,
    show: false,
    frame: false,
    icon: getWindowIcon(),
    titleBarStyle: 'hidden',
    backgroundColor: '#0A0A0A',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!splashWindow) {
      mainWindow?.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('maximize', () => {
    sendToRenderer('window:maximized-changed', true)
  })
  mainWindow.on('unmaximize', () => {
    sendToRenderer('window:maximized-changed', false)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function sendToRenderer(channel: string, ...args: unknown[]): void {
  mainWindow?.webContents.send(channel, ...args)
}

function createSplash(): void {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 320,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    show: false,
    center: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  splashWindow.on('ready-to-show', () => {
    splashWindow?.show()
  })

  splashWindow.on('show', () => {
    if (!splashShownAt) {
      splashShownAt = Date.now()
    }
  })

  splashWindow.on('closed', () => {
    splashWindow = null
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    splashWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/splash.html`)
  } else {
    splashWindow.loadFile(join(__dirname, '../renderer/splash.html'))
  }
}

function sendSplashStatus(message: string, isError = false): void {
  splashWindow?.webContents.send('splash-status', message, isError)
}

function waitForMainReady(): Promise<void> {
  return new Promise((resolve) => {
    if (!mainWindow) {
      resolve()
      return
    }
    mainWindow.once('ready-to-show', () => resolve())
  })
}

function waitForSplashVisible(): Promise<void> {
  return new Promise((resolve) => {
    if (!splashWindow || splashShownAt) {
      resolve()
      return
    }
    splashWindow.once('show', () => resolve())
  })
}

async function runStartup(): Promise<void> {
  sendSplashStatus('Checking components…')
  const bins = ytdlp.checkBinaries()
  if (!bins.ytDlp || !bins.ffmpeg) {
    sendSplashStatus('Required components are missing. Downloads may not work.', true)
  } else {
    sendSplashStatus('Loading settings…')
    store.getSettings()
    sendSplashStatus('Getting things ready…')
  }

  await Promise.race([waitForSplashVisible(), sleep(5000)])
  await Promise.race([waitForMainReady(), sleep(10000)])

  if (splashWindow && splashShownAt) {
    const visibleFor = Date.now() - splashShownAt
    if (visibleFor < SPLASH_DURATION) {
      await sleep(SPLASH_DURATION - visibleFor)
    }
  }

  mainWindow?.show()
  mainWindow?.focus()
  await sleep(150)
  splashWindow?.close()
  splashWindow = null
}

app.whenReady().then(() => {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:maximize-toggle', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      return false
    }
    mainWindow.maximize()
    return true
  })
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

  ipcMain.handle('detect-url', async (_event, urls: string[]) => {
    return ytdlp.detectUrls(urls)
  })

  ipcMain.handle('fetch-playlist', async (_event, url: string) => {
    return ytdlp.fetchPlaylist(url, (progress) => {
      sendToRenderer('fetch-progress', progress)
    })
  })

  ipcMain.handle('fetch-video-info', async (_event, url: string) => {
    return ytdlp.fetchVideoInfo(url)
  })

  ipcMain.handle(
    'start-download',
    async (_event, urls: string[], quality: string, outputDir: string) => {
      const id = ytdlp.startDownload(urls, quality, outputDir, {
        onProgress: (id, progress) => {
          sendToRenderer('download-progress', id, progress)
        },
        onComplete: (id, filename) => {
          sendToRenderer('download-complete', id, filename)
          let fileSize: string | undefined
          try {
            const stat = statSync(filename)
            if (stat.isFile()) fileSize = formatBytes(stat.size)
          } catch {
            fileSize = undefined
          }
          store.addToHistory({
            id,
            title: filename,
            url: urls[0],
            quality,
            filename,
            downloadedAt: new Date().toISOString(),
            fileSize
          })
        },
        onError: (id, error) => {
          sendToRenderer('download-error', id, error)
        }
      })
      return id
    }
  )

  ipcMain.handle('cancel-download', async (_event, id: string) => {
    ytdlp.cancelDownload(id)
  })

  ipcMain.handle('get-downloads', () => {
    return ytdlp.getDownloads()
  })

  ipcMain.handle('get-history', () => {
    return store.getHistory()
  })

  ipcMain.handle('clear-history', () => {
    store.clearHistory()
  })

  ipcMain.handle('remove-history-entry', (_event, id: string) => {
    if (typeof id === 'string' && id) {
      store.removeFromHistory(id)
    }
  })

  ipcMain.handle('get-settings', () => {
    return store.getSettings()
  })

  ipcMain.handle('reset-settings', () => {
    return store.resetSettings()
  })

  ipcMain.handle('get-disk-space', (_event, dir: string) => {
    try {
      if (typeof dir !== 'string' || !dir.trim()) return null
      const stats = statfsSync(dir)
      return {
        freeBytes: stats.bfree * stats.bsize,
        totalBytes: stats.blocks * stats.bsize
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('get-app-info', async () => {
    return {
      appVersion: app.getVersion(),
      electron: process.versions.electron || '',
      chrome: process.versions.chrome || '',
      node: process.versions.node || '',
      ytdlp: await ytdlp.getVersion()
    }
  })

  ipcMain.handle('save-settings', (_event, settings) => {
    const current = store.getSettings()
    const quality =
      typeof settings?.quality === 'string' && VALID_QUALITIES.has(settings.quality)
        ? settings.quality
        : current.quality
    const concurrentDownloads =
      Number.isInteger(settings?.concurrentDownloads) &&
      (settings.concurrentDownloads as number) >= 1 &&
      (settings.concurrentDownloads as number) <= 5
        ? settings.concurrentDownloads
        : current.concurrentDownloads
    const outputDir =
      typeof settings?.outputDir === 'string' && settings.outputDir.trim()
        ? settings.outputDir
        : current.outputDir
    store.saveSettings({ quality, outputDir, concurrentDownloads })
  })

  ipcMain.handle('choose-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('show-in-folder', async (_event, filePath: string) => {
    try {
      if (typeof filePath !== 'string' || !filePath.trim()) {
        return { ok: false, error: 'No file path available for this download.' }
      }
      const normalized = normalize(filePath.trim())
      if (!existsSync(normalized)) {
        const dir = dirname(normalized)
        if (existsSync(dir)) {
          const openErr = await shell.openPath(dir)
          if (openErr) {
            return { ok: false, error: openErr }
          }
          return {
            ok: false,
            openedFolder: true,
            error: 'File no longer exists at the saved location. Opened its folder instead.'
          }
        }
        return { ok: false, error: 'File no longer exists at the saved location.' }
      }
      if (statSync(normalized).isDirectory()) {
        const openErr = await shell.openPath(normalized)
        if (openErr) {
          return { ok: false, error: openErr }
        }
        return { ok: true }
      }
      shell.showItemInFolder(normalized)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not open folder.' }
    }
  })

  createSplash()
  createWindow()
  void runStartup()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  ytdlp.cleanup()
  app.quit()
})
