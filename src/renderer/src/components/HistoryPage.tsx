import { useState, useEffect, useMemo, useCallback } from 'react'

interface HistoryEntry {
  id: string
  title: string
  url: string
  quality: string
  filename: string
  downloadedAt: string
  fileSize?: string
}

interface HistoryPageProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
  onDownload: (urls: string[], quality: string) => void
  onGoHome: () => void
}

type SortMode = 'newest' | 'oldest' | 'name'

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function baseName(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function dayKey(iso: string): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return 'Earlier'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (time >= startOfToday) return 'Today'
  if (time >= startOfToday - 86400000) return 'Yesterday'
  return 'Earlier'
}

function HistoryPage({ showToast, onDownload, onGoHome }: HistoryPageProps): React.JSX.Element {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [search, setSearch] = useState('')
  const [qualityFilter, setQualityFilter] = useState('all')
  const [sort, setSort] = useState<SortMode>('newest')

  useEffect(() => {
    let mounted = true
    const load = (): void => {
      window.api.getHistory().then((h) => {
        if (mounted) setHistory(h)
      })
    }
    load()
    const unsub = window.api.onDownloadComplete(() => load())
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  const qualityOptions = useMemo(
    () => Array.from(new Set(history.map((e) => e.quality))),
    [history]
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = history.filter(
      (e) =>
        (!q || e.filename.toLowerCase().includes(q)) &&
        (qualityFilter === 'all' || e.quality === qualityFilter)
    )
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.filename.localeCompare(b.filename)
      if (sort === 'oldest') {
        return new Date(a.downloadedAt).getTime() - new Date(b.downloadedAt).getTime()
      }
      return new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
    })
  }, [history, search, qualityFilter, sort])

  const groups = useMemo(() => {
    const out: { label: string; entries: HistoryEntry[] }[] = []
    for (const entry of visible) {
      const label = dayKey(entry.downloadedAt)
      const group = out.find((g) => g.label === label)
      if (group) group.entries.push(entry)
      else out.push({ label, entries: [entry] })
    }
    return out
  }, [visible])

  const handleClear = useCallback(async () => {
    await window.api.clearHistory()
    setHistory([])
    showToast('info', 'History cleared')
  }, [showToast])

  const handleDelete = useCallback(async (id: string) => {
    await window.api.removeHistoryEntry(id)
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const handleRedownload = useCallback(
    (entry: HistoryEntry) => {
      onDownload([entry.url], entry.quality)
    },
    [onDownload]
  )

  const handleShowInFolder = useCallback(
    async (filename: string) => {
      try {
        const result = await window.api.showInFolder(filename)
        if (result && !result.ok) {
          showToast(result.openedFolder ? 'info' : 'error', result.error || 'Could not open folder.')
        }
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Could not open folder.')
      }
    },
    [showToast]
  )

  const hasFilters = search.trim() !== '' || qualityFilter !== 'all'

  const clearFilters = (): void => {
    setSearch('')
    setQualityFilter('all')
  }

  return (
    <div className="page history-page">
      <div className="page-header">
        <h1 className="page-title">History</h1>
        <div className="history-header-actions">
          {history.length > 0 && (
            <span className="history-count">
              {history.length} download{history.length === 1 ? '' : 's'}
            </span>
          )}
          {history.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleClear}>
              Clear History
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state home-hero">
          <div className="hero-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2>No download history yet</h2>
          <p>Completed downloads will appear here for quick re-downloads.</p>
          <button className="btn btn-primary" onClick={onGoHome}>
            Paste a link
          </button>
        </div>
      ) : (
        <>
          <div className="history-toolbar">
            <div className="playlist-filter">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                className="playlist-filter-input"
                placeholder="Search history…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="playlist-filter-clear"
                  onClick={() => setSearch('')}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                      d="M1 1l8 8M9 1L1 9"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
            <select
              className="select"
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              title="Filter by quality"
            >
              <option value="all">All qualities</option>
              {qualityOptions.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              title="Sort history"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <div className="history-empty-filter">
              <p>No history matches your filters.</p>
              {hasFilters && (
                <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="history-group animate-in">
                <div className="history-group-label">{group.label}</div>
                <div className="history-list">
                  {group.entries.map((entry) => (
                    <div key={entry.id} className="history-item">
                      <div className="history-item-title" title={entry.filename}>
                        <div className="history-item-file">{baseName(entry.filename)}</div>
                      </div>
                      <div className="history-item-meta">
                        {entry.fileSize && (
                          <span className="history-item-size">{entry.fileSize}</span>
                        )}
                        <span className="history-item-quality">{entry.quality}</span>
                        <span className="history-item-time">
                          {formatRelativeTime(entry.downloadedAt)}
                        </span>
                        <div className="history-item-actions">
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => handleRedownload(entry)}
                            title="Download again"
                            aria-label={`Download ${baseName(entry.filename)} again`}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                              <path d="M7 10l5 5 5-5" />
                              <path d="M12 15V3" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => void handleShowInFolder(entry.filename)}
                            title="Show in folder"
                            aria-label="Show in folder"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-ghost btn-icon danger"
                            onClick={() => void handleDelete(entry.id)}
                            title="Remove from history"
                            aria-label="Remove from history"
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12">
                              <path
                                d="M1 1l10 10M11 1L1 11"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}

export default HistoryPage
