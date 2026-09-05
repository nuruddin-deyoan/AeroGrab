export interface DownloadProgress {
  percent: number
  speed: string
  eta: string
  totalSize: string
  status: 'downloading' | 'merging' | 'finished' | 'error'
}

export interface AppSettings {
  quality: string
  outputDir: string
  concurrentDownloads: number
}

export interface VideoInfo {
  title: string
  thumbnail: string
  duration: number
  channel: string
  formats: FormatInfo[]
}

export interface FormatInfo {
  formatId: string
  label: string
  ext: string
  height?: number
  fps?: number
  vcodec: string
  acodec: string
  filesize?: number
}

export interface PlaylistVideo {
  index: number
  id: string
  title: string
  url: string
  duration: number
  thumbnail: string
  selected: boolean
}

export interface Detection {
  type: 'single' | 'playlist' | 'channel' | 'multi' | 'unknown'
  urls: string[]
  title?: string
  count?: number
}
