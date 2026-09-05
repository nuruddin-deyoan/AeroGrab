import { ElectronAPI } from '@electron-toolkit/preload'

type DetectionType = 'single' | 'playlist' | 'channel' | 'multi' | 'unknown'
type Detection = {
  type: DetectionType
  urls: string[]
  title?: string
  count?: number
}

interface Api {
  minimize: () => Promise<void>
  close: () => Promise<void>
  maximizeToggle: () => Promise<boolean>
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (maximized: boolean) => void) => () => void
  detectUrls: (urls: string[]) => Promise<Detection>
  fetchPlaylist: (url: string) => Promise<
    {
      index: number
      id: string
      title: string
      url: string
      duration: number
      thumbnail: string
      selected: boolean
    }[]
  >
  fetchVideoInfo: (url: string) => Promise<{
    title: string
    thumbnail: string
    duration: number
    channel: string
    formats: {
      formatId: string
      label: string
      ext: string
      height?: number
      fps?: number
      vcodec: string
      acodec: string
      filesize?: number
    }[]
  }>
  startDownload: (
    urls: string[],
    quality: string,
    outputDir: string
  ) => Promise<string>
  cancelDownload: (id: string) => Promise<void>
  getDownloads: () => Promise<unknown[]>
  onDownloadProgress: (callback: (id: string, progress: unknown) => void) => () => void
  onDownloadComplete: (callback: (id: string, filename: string) => void) => () => void
  onDownloadError: (callback: (id: string, error: string) => void) => () => void
  onFetchProgress: (callback: (progress: string) => void) => () => void
  getHistory: () => Promise<
    {
      id: string
      title: string
      url: string
      quality: string
      filename: string
      downloadedAt: string
      fileSize?: string
    }[]
  >
  clearHistory: () => Promise<void>
  removeHistoryEntry: (id: string) => Promise<void>
  getSettings: () => Promise<{
    quality: string
    outputDir: string
    concurrentDownloads: number
  }>
  saveSettings: (settings: {
    quality: string
    outputDir: string
    concurrentDownloads: number
  }) => Promise<void>
  resetSettings: () => Promise<{
    quality: string
    outputDir: string
    concurrentDownloads: number
  }>
  getDiskSpace: (dir: string) => Promise<{ freeBytes: number; totalBytes: number } | null>
  getAppInfo: () => Promise<{
    appVersion: string
    electron: string
    chrome: string
    node: string
    ytdlp: string
  }>
  chooseDirectory: () => Promise<string | null>
  showInFolder: (filePath: string) => Promise<{ ok: boolean; error?: string; openedFolder?: boolean }>
  onSplashStatus: (callback: (message: string, isError: boolean) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
