import { useState, useEffect, useRef } from 'react'
import type { AppSettings } from '../types'

// ── TODO: fill in your real URLs below (shown on the Settings credit card) ──
const GITHUB_PROFILE_URL = 'https://github.com/nuruddin-deyoan'
const SOURCE_CODE_URL = 'https://github.com/nuruddin-deyoan/AeroGrab'

interface SettingsPageProps {
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
  onResetSettings: () => Promise<void>
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
}

interface DiskInfo {
  freeBytes: number
  totalBytes: number
}

interface AppInfo {
  appVersion: string
  electron: string
  chrome: string
  node: string
  ytdlp: string
}

const QUALITY_OPTIONS = [
  { id: 'best', label: 'Best', desc: 'Original quality · largest files' },
  { id: '1080p', label: '1080p', desc: 'Full HD video' },
  { id: '720p', label: '720p', desc: 'Recommended · good balance' },
  { id: '480p', label: '480p', desc: 'Smaller files' },
  { id: '360p', label: '360p', desc: 'Smallest video size' },
  { id: 'audio', label: 'Audio Only', desc: 'MP3 · no video' }
]

const LOW_DISK_BYTES = 1024 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unit]}`
}

function SettingsPage({
  settings,
  onSettingsChange,
  onResetSettings,
  showToast
}: SettingsPageProps): React.JSX.Element {
  const [outputDir, setOutputDir] = useState(settings.outputDir)
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const firstRender = useRef(true)

  useEffect(() => {
    setOutputDir(settings.outputDir)
  }, [settings.outputDir])

  useEffect(() => {
    let mounted = true
    window.api.getAppInfo().then((info) => {
      if (mounted) setAppInfo(info)
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    setDiskInfo(null)
    if (!settings.outputDir) return undefined
    window.api.getDiskSpace(settings.outputDir).then((info) => {
      if (mounted) setDiskInfo(info)
    })
    return () => {
      mounted = false
    }
  }, [settings.outputDir])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setJustSaved(true)
    const timer = setTimeout(() => setJustSaved(false), 1500)
    return () => clearTimeout(timer)
  }, [settings])

  useEffect(() => {
    if (!confirmingReset) return undefined
    const timer = setTimeout(() => setConfirmingReset(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmingReset])

  const handleQuality = (quality: string): void => {
    onSettingsChange({ ...settings, quality })
  }

  const handleConcurrent = (delta: number): void => {
    const next = Math.min(5, Math.max(1, settings.concurrentDownloads + delta))
    if (next !== settings.concurrentDownloads) {
      onSettingsChange({ ...settings, concurrentDownloads: next })
    }
  }

  const handleChooseDir = async (): Promise<void> => {
    const dir = await window.api.chooseDirectory()
    if (dir) {
      setOutputDir(dir)
      onSettingsChange({ ...settings, outputDir: dir })
    }
  }

  const handleOpenDir = async (): Promise<void> => {
    try {
      const result = await window.api.showInFolder(settings.outputDir)
      if (result && !result.ok) {
        showToast(result.openedFolder ? 'info' : 'error', result.error || 'Could not open folder.')
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not open folder.')
    }
  }

  const handleReset = async (): Promise<void> => {
    if (!confirmingReset) {
      setConfirmingReset(true)
      return
    }
    setConfirmingReset(false)
    await onResetSettings()
  }

  const diskLow = diskInfo !== null && diskInfo.freeBytes < LOW_DISK_BYTES

  return (
    <div className="page settings-page animate-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <span className="settings-saved">
          <span className={`settings-saved-dot${justSaved ? ' on' : ''}`} aria-hidden="true" />
          {justSaved ? 'Saved' : 'Changes save automatically'}
        </span>
      </div>

      <section className="settings-section">
        <h2 className="settings-heading">Download Quality</h2>
        <p className="settings-desc">Default quality for new downloads.</p>
        <div className="quality-cards">
          {QUALITY_OPTIONS.map((q) => (
            <label
              key={q.id}
              className={`quality-card${settings.quality === q.id ? ' selected' : ''}`}
            >
              <input
                type="radio"
                name="quality"
                checked={settings.quality === q.id}
                onChange={() => handleQuality(q.id)}
                className="radio"
              />
              <span className="quality-card-text">
                <span className="quality-card-label">{q.label}</span>
                <span className="quality-card-desc">{q.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-heading">Download Location</h2>
        <div className="settings-path-row">
          <span className="settings-path" title={outputDir}>
            {outputDir}
          </span>
          <div className="settings-path-actions">
            <button className="btn btn-secondary" onClick={() => void handleOpenDir()}>
              Open
            </button>
            <button className="btn btn-secondary" onClick={() => void handleChooseDir()}>
              Change
            </button>
          </div>
        </div>
        {diskInfo && (
          <p className={`settings-disk${diskLow ? ' low' : ''}`}>
            {formatBytes(diskInfo.freeBytes)} free of {formatBytes(diskInfo.totalBytes)}
            {diskLow && ' · running low on space'}
          </p>
        )}
      </section>

      <section className="settings-section">
        <h2 className="settings-heading">Concurrent Downloads</h2>
        <div className="stepper">
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => handleConcurrent(-1)}
            disabled={settings.concurrentDownloads <= 1}
            aria-label="Fewer concurrent downloads"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="5.4" width="10" height="1.2" fill="currentColor" />
            </svg>
          </button>
          <span className="stepper-value" aria-live="polite">
            {settings.concurrentDownloads}
          </span>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => handleConcurrent(1)}
            disabled={settings.concurrentDownloads >= 5}
            aria-label="More concurrent downloads"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M6 1v10M1 6h10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <p className="settings-hint">
          Up to {settings.concurrentDownloads} download
          {settings.concurrentDownloads === 1 ? '' : 's'} running at the same time.
        </p>
      </section>

      <section className="settings-section">
        <h2 className="settings-heading">About</h2>
        {appInfo ? (
          <div className="about-grid">
            <span className="about-key">AeroGrab</span>
            <span className="about-val">v{appInfo.appVersion}</span>
            <span className="about-key">yt-dlp</span>
            <span className="about-val">{appInfo.ytdlp}</span>
            <span className="about-key">Electron</span>
            <span className="about-val">{appInfo.electron}</span>
            <span className="about-key">Chrome</span>
            <span className="about-val">{appInfo.chrome}</span>
            <span className="about-key">Node</span>
            <span className="about-val">{appInfo.node}</span>
          </div>
        ) : (
          <p className="settings-about">Loading version info…</p>
        )}
        <div className="credit-card">
          <span className="credit-heart" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
          </span>
          <div className="credit-text">
            <p className="credit-line">
              Developed with love by <strong>Nuruddin Deyoan</strong>
            </p>
            <p className="credit-sub">
              Powered by yt-dlp and ffmpeg · Built with Electron and React · Thanks to
              the open-source communities behind them
            </p>
            <div className="credit-links">
              <a
                className="credit-link"
                href={GITHUB_PROFILE_URL}
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                GitHub Profile
              </a>
              <a
                className="credit-link"
                href={SOURCE_CODE_URL}
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
                </svg>
                Source Code
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section danger-zone">
        <h2 className="settings-heading">Reset Settings</h2>
        <p className="settings-desc">
          Restore the default quality, download location, and concurrency.
        </p>
        <button
          className={`btn ${confirmingReset ? 'btn-danger' : 'btn-secondary'}`}
          onClick={() => void handleReset()}
        >
          {confirmingReset ? 'Click again to confirm' : 'Reset to defaults'}
        </button>
      </section>
    </div>
  )
}

export default SettingsPage
