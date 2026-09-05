import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface HistoryEntry {
  id: string
  title: string
  url: string
  quality: string
  filename: string
  downloadedAt: string
  fileSize?: string
}

export interface AppSettings {
  quality: string
  outputDir: string
  concurrentDownloads: number
}

const DEFAULT_SETTINGS: AppSettings = {
  quality: '720p',
  outputDir: '',
  concurrentDownloads: 3
}

export class StoreManager {
  private dataDir: string
  private historyPath: string
  private settingsPath: string
  private history: HistoryEntry[] = []
  private settings: AppSettings

  constructor() {
    this.dataDir = app.getPath('userData')
    this.historyPath = join(this.dataDir, 'history.json')
    this.settingsPath = join(this.dataDir, 'settings.json')

    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true })
    }

    this.history = this.loadJson<HistoryEntry[]>(this.historyPath, [])
    this.settings = this.loadJson<AppSettings>(this.settingsPath, {
      ...DEFAULT_SETTINGS,
      outputDir: app.getPath('downloads')
    })

    if (!this.settings.outputDir) {
      this.settings.outputDir = app.getPath('downloads')
    }
  }

  private loadJson<T>(path: string, fallback: T): T {
    try {
      if (existsSync(path)) {
        const data = readFileSync(path, 'utf-8')
        return JSON.parse(data) as T
      }
    } catch {
      // ignore
    }
    return fallback
  }

  private saveJson(path: string, data: unknown): void {
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
  }

  getHistory(): HistoryEntry[] {
    return this.history
  }

  addToHistory(entry: HistoryEntry): void {
    this.history.unshift(entry)
    if (this.history.length > 500) {
      this.history = this.history.slice(0, 500)
    }
    this.saveJson(this.historyPath, this.history)
  }

  clearHistory(): void {
    this.history = []
    this.saveJson(this.historyPath, this.history)
  }

  removeFromHistory(id: string): void {
    this.history = this.history.filter((e) => e.id !== id)
    this.saveJson(this.historyPath, this.history)
  }

  getSettings(): AppSettings {
    return this.settings
  }

  saveSettings(settings: AppSettings): void {
    this.settings = settings
    this.saveJson(this.settingsPath, this.settings)
  }

  resetSettings(): AppSettings {
    this.settings = { ...DEFAULT_SETTINGS, outputDir: app.getPath('downloads') }
    this.saveJson(this.settingsPath, this.settings)
    return this.settings
  }
}
