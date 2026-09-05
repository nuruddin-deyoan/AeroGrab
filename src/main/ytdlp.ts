import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { app } from 'electron'
import { randomUUID } from 'crypto'

export interface UrlDetection {
  type: 'single' | 'playlist' | 'channel' | 'multi' | 'unknown'
  urls: string[]
  title?: string
  count?: number
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

export interface DownloadProgress {
  percent: number
  speed: string
  eta: string
  totalSize: string
  status: 'downloading' | 'merging' | 'finished' | 'error'
}

export interface DownloadItem {
  id: string
  url: string
  quality: string
  progress: DownloadProgress
  filename?: string
}

interface DownloadCallbacks {
  onProgress: (id: string, progress: DownloadProgress) => void
  onComplete: (id: string, filename: string) => void
  onError: (id: string, error: string) => void
}

function getBinaryPath(name: string): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, name)
  }
  return join(app.getAppPath(), 'resources', name)
}

function killProcessTree(proc: ChildProcess): void {
  try {
    if (!proc.pid) return
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], {
        windowsHide: true,
        shell: false
      })
    } else {
      proc.kill('SIGKILL')
    }
  } catch {
    try {
      proc.kill()
    } catch {
      // ignore
    }
  }
}

function cleanUrl(url: string): string {
  return url.replace(/[.,;:!?'")\]}>]+$/g, '').replace(/^[(<\[{]+/g, '')
}

export class YtDlpManager {
  private processes: Map<string, ChildProcess> = new Map()
  private downloads: Map<string, DownloadItem> = new Map()
  private cancelled: Set<string> = new Set()
  private versionCache: string | null = null
  private ytDlpPath: string
  private ffmpegPath: string

  constructor() {
    this.ytDlpPath = getBinaryPath('yt-dlp.exe')
    this.ffmpegPath = getBinaryPath('ffmpeg.exe')
  }

  private runCommand(args: string[], timeout = 30000): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''
      const proc = spawn(this.ytDlpPath, args, {
        windowsHide: true,
        shell: false
      })

      const timer = setTimeout(() => {
        proc.kill()
        reject(new Error('Command timed out'))
      }, timeout)

      proc.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`))
        }
      })

      proc.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
  }

  checkBinaries(): { ytDlp: boolean; ffmpeg: boolean } {
    try {
      return { ytDlp: existsSync(this.ytDlpPath), ffmpeg: existsSync(this.ffmpegPath) }
    } catch {
      return { ytDlp: false, ffmpeg: false }
    }
  }

  async getVersion(): Promise<string> {
    if (this.versionCache) return this.versionCache
    try {
      const output = await this.runCommand(['--version'], 15000)
      this.versionCache = output.trim().split('\n')[0] || 'unknown'
    } catch {
      this.versionCache = 'unknown'
    }
    return this.versionCache
  }

  async detectUrls(inputs: string[]): Promise<UrlDetection> {
    const urlPattern = /https?:\/\/[^\s]+/gi
    const allUrls: string[] = []

    for (const input of inputs) {
      const matches = input.match(urlPattern)
      if (matches) {
        for (const m of matches) {
          const cleaned = cleanUrl(m)
          if (cleaned) allUrls.push(cleaned)
        }
      }
    }

    if (allUrls.length === 0) {
      return { type: 'unknown', urls: [] }
    }

    if (allUrls.length === 1) {
      const url = allUrls[0]
      if (/playlist\?list=/i.test(url) || /[?&]list=[^&]+/.test(url)) {
        try {
          const output = await this.runCommand(
            ['--flat-playlist', '-j', '--playlist-items', '1:1', url],
            15000
          )
          const lines = output.trim().split('\n').filter(Boolean)
          if (lines.length > 0) {
            const info = JSON.parse(lines[0])
            const count = info.playlist_count || info.n_entries || 0
            return {
              type: 'playlist',
              urls: [url],
              title: info.playlist_title || info.playlist || 'Playlist',
              count
            }
          }
        } catch {
          return { type: 'playlist', urls: [url], title: 'Playlist' }
        }
      }

      if (/youtube\.com\/(@|channel\/|c\/|user\/)/i.test(url)) {
        try {
          const output = await this.runCommand(
            ['--flat-playlist', '-j', '--playlist-items', '1:1', url],
            15000
          )
          const lines = output.trim().split('\n').filter(Boolean)
          if (lines.length > 0) {
            const info = JSON.parse(lines[0])
            const count = info.playlist_count || info.n_entries || 0
            const channel = info.channel || info.uploader || 'Channel'
            return {
              type: 'channel',
              urls: [url],
              title: channel,
              count
            }
          }
        } catch {
          return { type: 'channel', urls: [url], title: 'Channel' }
        }
      }

      return { type: 'single', urls: [url] }
    }

    return { type: 'multi', urls: allUrls }
  }

  async fetchPlaylist(
    url: string,
    onProgress?: (msg: string) => void
  ): Promise<PlaylistVideo[]> {
    onProgress?.('Fetching playlist videos...')
    const output = await this.runCommand(
      ['--flat-playlist', '-j', url],
      120000
    )
    const lines = output.trim().split('\n').filter(Boolean)
    const videos: PlaylistVideo[] = []

    for (let i = 0; i < lines.length; i++) {
      try {
        const info = JSON.parse(lines[i])
        videos.push({
          index: info.playlist_index || i + 1,
          id: info.id || '',
          title: info.title || info.fulltitle || `Video ${i + 1}`,
          url: info.url || info.webpage_url || `https://www.youtube.com/watch?v=${info.id}`,
          duration: info.duration || 0,
          thumbnail: info.thumbnail || '',
          selected: true
        })
      } catch {
        continue
      }
    }

    return videos
  }

  async fetchVideoInfo(url: string): Promise<VideoInfo> {
    const output = await this.runCommand(['-j', url], 15000)
    const info = JSON.parse(output.trim())

    const formats: FormatInfo[] = []
    const seen = new Set<string>()

    for (const f of info.formats || []) {
      const height = f.height
      const key = `${height || 'audio'}_${f.ext}`
      if (seen.has(key)) continue
      seen.add(key)

      if (height && height < 144) continue

      formats.push({
        formatId: f.format_id,
        label: height ? `${height}p${f.fps > 30 ? f.fps : ''}` : `Audio (${f.abr || '?'}kbps)`,
        ext: f.ext,
        height: height || undefined,
        fps: f.fps || undefined,
        vcodec: f.vcodec || 'none',
        acodec: f.acodec || 'none',
        filesize: f.filesize || f.filesize_approx || undefined
      })
    }

    formats.sort((a, b) => (b.height || 0) - (a.height || 0))

    return {
      title: info.title || 'Unknown',
      thumbnail: info.thumbnail || '',
      duration: info.duration || 0,
      channel: info.channel || info.uploader || 'Unknown',
      formats
    }
  }

  getFormatArg(quality: string): string {
    switch (quality) {
      case 'best':
        return 'bestvideo+bestaudio/best'
      case '1080p':
        return 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
      case '720p':
        return 'bestvideo[height<=720]+bestaudio/best[height<=720]/best'
      case '480p':
        return 'bestvideo[height<=480]+bestaudio/best[height<=480]/best'
      case '360p':
        return 'bestvideo[height<=360]+bestaudio/best[height<=360]/best'
      case 'audio':
        return 'bestaudio'
      default:
        return 'bestvideo[height<=720]+bestaudio/best[height<=720]/best'
    }
  }

  startDownload(
    urls: string[],
    quality: string,
    outputDir: string,
    callbacks: DownloadCallbacks
  ): string {
    const id = randomUUID()

    const formatArg = this.getFormatArg(quality)
    const outputTemplate = join(outputDir, '%(title)s.%(ext)s')

    const args = [
      '-f', formatArg,
      '--newline',
      '--no-playlist',
      '-o', outputTemplate,
      '--ffmpeg-location', this.ffmpegPath
    ]

    if (quality === 'audio') {
      args.push('--extract-audio', '--audio-format', 'mp3')
    }

    args.push(...urls)

    const proc = spawn(this.ytDlpPath, args, {
      windowsHide: true,
      shell: false
    })

    this.processes.set(id, proc)

    const item: DownloadItem = {
      id,
      url: urls[0],
      quality,
      progress: {
        percent: 0,
        speed: '',
        eta: '',
        totalSize: '',
        status: 'downloading'
      }
    }
    this.downloads.set(id, item)

    let outputBuffer = ''

    proc.stdout?.on('data', (data) => {
      outputBuffer += data.toString()
      const lines = outputBuffer.split('\n')
      outputBuffer = lines.pop() || ''

      for (const line of lines) {
        const progressMatch = line.match(
          /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\w+|Unknown)?\s+at\s+([\d.]+\w+\/s|Unknown speed)?\s+ETA\s+(\S+)/
        )
        if (progressMatch) {
          const percent = parseFloat(progressMatch[1])
          const rawSize = progressMatch[2]
          const rawSpeed = progressMatch[3]
          const rawEta = progressMatch[4]
          const progress: DownloadProgress = {
            percent,
            totalSize:
              rawSize && rawSize !== 'Unknown' ? rawSize : item.progress.totalSize,
            speed: rawSpeed && rawSpeed !== 'Unknown speed' ? rawSpeed : '',
            eta: rawEta && rawEta !== 'Unknown' ? rawEta : '',
            status: percent >= 100 ? 'merging' : 'downloading'
          }
          item.progress = progress
          callbacks.onProgress(id, progress)
          continue
        }

        if (line.includes('[download] 100%')) {
          const progress: DownloadProgress = {
            percent: 100,
            speed: '',
            eta: '',
            totalSize: item.progress.totalSize,
            status: 'merging'
          }
          item.progress = progress
          callbacks.onProgress(id, progress)
          continue
        }

        const alreadyMatch = line.match(/\[download\]\s+(.+)\s+has already been downloaded/)
        if (alreadyMatch) {
          item.filename = alreadyMatch[1].trim()
          const progress: DownloadProgress = {
            percent: 100,
            speed: '',
            eta: '',
            totalSize: item.progress.totalSize,
            status: 'merging'
          }
          item.progress = progress
          callbacks.onProgress(id, progress)
          continue
        }

        const destMatch = line.match(/\[download\] Destination: (.+)/)
        if (destMatch) {
          item.filename = destMatch[1].trim()
          continue
        }

        const mergeMatch = line.match(/\[Merger\] Merging formats into "(.+)"/)
        if (mergeMatch) {
          item.filename = mergeMatch[1].trim()
          continue
        }

        const extractMatch = line.match(/\[ExtractAudio\] Destination: (.+)/)
        if (extractMatch) {
          item.filename = extractMatch[1].trim()
          continue
        }

        const ffmpegMatch = line.match(/\[ffmpeg\] Destination: (.+)/)
        if (ffmpegMatch) {
          item.filename = ffmpegMatch[1].trim().replace(/^"|"$/g, '')
        }
      }
    })

    proc.stderr?.on('data', (data) => {
      if (this.cancelled.has(id)) return
      const text = data.toString()
      if (text.includes('ERROR')) {
        item.progress = { ...item.progress, status: 'error' }
        callbacks.onError(id, text.trim())
      }
    })

    proc.on('close', (code) => {
      this.processes.delete(id)
      if (this.cancelled.has(id)) {
        this.cancelled.delete(id)
        return
      }
      if (code === 0) {
        const filename = item.filename || urls[0]
        const progress: DownloadProgress = {
          percent: 100,
          speed: '',
          eta: '',
          totalSize: item.progress.totalSize,
          status: 'finished'
        }
        item.progress = progress
        callbacks.onProgress(id, progress)
        callbacks.onComplete(id, filename)
      } else {
        item.progress = { ...item.progress, status: 'error' }
        callbacks.onError(id, `yt-dlp exited with code ${code}`)
      }
    })

    return id
  }

  cancelDownload(id: string): void {
    const proc = this.processes.get(id)
    if (proc) {
      this.cancelled.add(id)
      killProcessTree(proc)
      this.processes.delete(id)
    }
    this.downloads.delete(id)
  }

  getDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values())
  }

  cleanup(): void {
    for (const [, proc] of this.processes) {
      killProcessTree(proc)
    }
    this.processes.clear()
    this.cancelled.clear()
  }
}
