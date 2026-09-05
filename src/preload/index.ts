import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  maximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (callback: (maximized: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) =>
      callback(maximized)
    ipcRenderer.on('window:maximized-changed', listener)
    return () => ipcRenderer.removeListener('window:maximized-changed', listener)
  },

  detectUrls: (urls: string[]) => ipcRenderer.invoke('detect-url', urls),
  fetchPlaylist: (url: string) => ipcRenderer.invoke('fetch-playlist', url),
  fetchVideoInfo: (url: string) => ipcRenderer.invoke('fetch-video-info', url),

  startDownload: (urls: string[], quality: string, outputDir: string) =>
    ipcRenderer.invoke('start-download', urls, quality, outputDir),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),

  onDownloadProgress: (callback: (id: string, progress: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string, progress: unknown) =>
      callback(id, progress)
    ipcRenderer.on('download-progress', listener)
    return () => ipcRenderer.removeListener('download-progress', listener)
  },
  onDownloadComplete: (callback: (id: string, filename: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string, filename: string) =>
      callback(id, filename)
    ipcRenderer.on('download-complete', listener)
    return () => ipcRenderer.removeListener('download-complete', listener)
  },
  onDownloadError: (callback: (id: string, error: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string, error: string) =>
      callback(id, error)
    ipcRenderer.on('download-error', listener)
    return () => ipcRenderer.removeListener('download-error', listener)
  },
  onFetchProgress: (callback: (progress: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: string) =>
      callback(progress)
    ipcRenderer.on('fetch-progress', listener)
    return () => ipcRenderer.removeListener('fetch-progress', listener)
  },

  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  removeHistoryEntry: (id: string) => ipcRenderer.invoke('remove-history-entry', id),

  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  getDiskSpace: (dir: string) => ipcRenderer.invoke('get-disk-space', dir),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),

  showInFolder: (filePath: string) => ipcRenderer.invoke('show-in-folder', filePath),

  onSplashStatus: (callback: (message: string, isError: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string, isError: boolean) =>
      callback(message, isError)
    ipcRenderer.on('splash-status', listener)
    return () => ipcRenderer.removeListener('splash-status', listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
