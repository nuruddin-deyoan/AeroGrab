import { useState, useEffect, useCallback, useRef } from 'react'
import Titlebar from './components/Titlebar'
import Tabs from './components/Tabs'
import HomePage from './components/HomePage'
import QueuePage from './components/QueuePage'
import HistoryPage from './components/HistoryPage'
import SettingsPage from './components/SettingsPage'
import Toast from './components/common/Toast'
import type { DownloadProgress, AppSettings } from './types'

export type TabId = 'home' | 'queue' | 'history' | 'settings'

export interface QueueItem {
  id: string
  url: string
  title: string
  quality: string
  progress: DownloadProgress
  status: 'queued' | 'downloading' | 'completed' | 'error'
  error?: string
  filename?: string
}

interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [settings, setSettings] = useState<AppSettings>({
    quality: '720p',
    outputDir: '',
    concurrentDownloads: 3
  })
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const queueRef = useRef<QueueItem[]>([])
  queueRef.current = queue
  const pageContentRef = useRef<HTMLElement | null>(null)
  const scrollTops = useRef<Record<TabId, number>>({ home: 0, queue: 0, history: 0, settings: 0 })

  const handleTabChange = useCallback(
    (tab: TabId) => {
      const el = pageContentRef.current
      if (el) scrollTops.current[activeTab] = el.scrollTop
      setActiveTab(tab)
    },
    [activeTab]
  )

  useEffect(() => {
    const el = pageContentRef.current
    if (el) el.scrollTop = scrollTops.current[activeTab] || 0
  }, [activeTab])

  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-2), { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    let mounted = true
    Promise.all([window.api.getSettings(), window.api.getDownloads()]).then(
      ([s, downloads]) => {
        if (!mounted) return
        setSettings(s)
        const items = (downloads as QueueItem[]).map((d) => ({
          ...d,
          title: d.title || d.url,
          status:
            d.progress.status === 'finished'
              ? ('completed' as const)
              : d.progress.status === 'error'
                ? ('error' as const)
                : ('downloading' as const)
        }))
        setQueue(items)
      }
    )

    const unsubProgress = window.api.onDownloadProgress((id, p) => {
      const progress = p as DownloadProgress
      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                progress,
                status:
                  progress.status === 'finished'
                    ? 'completed'
                    : progress.status === 'error'
                      ? 'error'
                      : 'downloading'
              }
            : item
        )
      )
    })

    const unsubComplete = window.api.onDownloadComplete((id, filename) => {
      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: 'completed', filename, progress: { ...item.progress, percent: 100, status: 'finished' } }
            : item
        )
      )
      showToast('success', `Download complete: ${filename}`)
    })

    const unsubError = window.api.onDownloadError((id, error) => {
      if (!queueRef.current.some((item) => item.id === id)) return
      setQueue((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'error', error, progress: { ...item.progress, status: 'error' } } : item
        )
      )
      showToast('error', `Download failed: ${error}`)
    })

    return () => {
      mounted = false
      unsubProgress()
      unsubComplete()
      unsubError()
    }
  }, [showToast])

  const startItem = useCallback(
    async (queueItem: QueueItem, currentSettings: AppSettings) => {
      try {
        const realId = await window.api.startDownload(
          [queueItem.url],
          queueItem.quality,
          currentSettings.outputDir
        )
        setQueue((prev) =>
          prev.map((q) =>
            q.id === queueItem.id ? { ...q, id: realId, status: 'downloading' } : q
          )
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start download'
        setQueue((prev) =>
          prev.map((q) =>
            q.id === queueItem.id
              ? { ...q, status: 'error', error: message, progress: { ...q.progress, status: 'error' } }
              : q
          )
        )
        showToast('error', `Download failed: ${message}`)
      }
    },
    [showToast]
  )

  useEffect(() => {
    const maxConcurrent = settings.concurrentDownloads || 3

    if (
      queue.some(
        (item) =>
          item.status === 'downloading' && item.id.startsWith('pending-')
      )
    ) {
      return
    }

    const activeCount = queue.filter(
      (item) => item.status === 'downloading' && !item.id.startsWith('pending-')
    ).length

    const slots = maxConcurrent - activeCount
    if (slots <= 0) return

    const readyItems = queue
      .filter((item) => item.status === 'queued')
      .slice(0, slots)

    if (readyItems.length === 0) return

    const startingIds = new Set(readyItems.map((i) => i.id))
    setQueue((prev) =>
      prev.map((q) => (startingIds.has(q.id) ? { ...q, status: 'downloading' } : q))
    )
    for (const item of readyItems) {
      void startItem(item, settings)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, settings.concurrentDownloads])

  const handleDownload = useCallback((urls: string[], quality: string) => {
    const newItems: QueueItem[] = urls.map((url) => ({
      id: `pending-${Math.random().toString(36).slice(2)}`,
      url,
      title: url,
      quality,
      progress: { percent: 0, speed: '', eta: '', totalSize: '', status: 'downloading' },
      status: 'queued'
    }))

    setQueue((prev) => [...newItems, ...prev])
    setActiveTab('queue')
  }, [])

  const handleSettingsChange = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings)
    window.api.saveSettings(newSettings)
  }, [])

  const handleResetSettings = useCallback(async () => {
    const fresh = await window.api.resetSettings()
    setSettings(fresh)
    showToast('info', 'Settings reset to defaults')
  }, [showToast])

  const handleCancel = useCallback((id: string) => {
    if (!id.startsWith('pending-')) {
      window.api.cancelDownload(id)
    }
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const resetToQueued = (item: QueueItem): QueueItem => ({
    ...item,
    status: 'queued',
    error: undefined,
    progress: { percent: 0, speed: '', eta: '', totalSize: '', status: 'downloading' }
  })

  const handleRetry = useCallback((id: string) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? resetToQueued(item) : item)))
  }, [])

  const handleRetryAll = useCallback(() => {
    setQueue((prev) => prev.map((item) => (item.status === 'error' ? resetToQueued(item) : item)))
  }, [])

  const handleClearAll = useCallback(() => {
    for (const item of queueRef.current) {
      if (item.status === 'downloading' && !item.id.startsWith('pending-')) {
        window.api.cancelDownload(item.id)
      }
    }
    setQueue([])
  }, [])

  return (
    <div className="app">
      <Titlebar
        activeCount={queue.filter((q) => q.status === 'downloading').length}
      />
      <Tabs activeTab={activeTab} onTabChange={handleTabChange} queueCount={queue.length} />
      <main className="page-content" ref={pageContentRef}>
        <div className={`page-keep-alive${activeTab === 'home' ? '' : ' is-hidden'}`}>
          <HomePage settings={settings} onDownload={handleDownload} />
        </div>
        <div className={`page-keep-alive${activeTab === 'queue' ? '' : ' is-hidden'}`}>
          <QueuePage
            items={queue}
            onCancel={handleCancel}
            onClearCompleted={() =>
              setQueue((prev) => prev.filter((q) => q.status !== 'completed' && q.status !== 'error'))
            }
            onClearAll={handleClearAll}
            onRetry={handleRetry}
            onRetryAll={handleRetryAll}
            onGoHome={() => handleTabChange('home')}
            showToast={showToast}
          />
        </div>
        <div className={`page-keep-alive${activeTab === 'history' ? '' : ' is-hidden'}`}>
          <HistoryPage
            showToast={showToast}
            onDownload={handleDownload}
            onGoHome={() => handleTabChange('home')}
          />
        </div>
        <div className={`page-keep-alive${activeTab === 'settings' ? '' : ' is-hidden'}`}>
          <SettingsPage
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onResetSettings={handleResetSettings}
            showToast={showToast}
          />
        </div>
      </main>
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} type={toast.type} message={toast.message} />
        ))}
      </div>
    </div>
  )
}

export default App
