import type { QueueItem } from '../App'

interface QueuePageProps {
  items: QueueItem[]
  onCancel: (id: string) => void
  onClearCompleted: () => void
  onClearAll: () => void
  onRetry: (id: string) => void
  onRetryAll: () => void
  onGoHome: () => void
  showToast: (type: 'success' | 'error' | 'info', message: string) => void
}

function baseName(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function prettifyUrl(url: string): string {
  try {
    const u = new URL(url)
    const v = u.searchParams.get('v')
    if (v && (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be'))) {
      return `youtube.com/watch?v=${v}`
    }
    const path = u.pathname && u.pathname !== '/' ? u.pathname : ''
    return `${u.hostname}${path}`
  } catch {
    return url
  }
}

function primaryText(item: QueueItem): string {
  if (item.status === 'completed' && item.filename) return baseName(item.filename)
  if (item.title && !/^https?:\/\//i.test(item.title)) return item.title
  if (item.filename) return baseName(item.filename)
  return prettifyUrl(item.url)
}

const STATUS_ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const

function StatusIcon({ status }: { status: QueueItem['status'] }): React.JSX.Element {
  if (status === 'downloading') {
    return <span className="mini-spinner" aria-hidden="true" />
  }
  if (status === 'completed') {
    return (
      <svg {...STATUS_ICON_PROPS}>
        <path d="M22 11.1V12a10 10 0 11-5.9-9.1" />
        <path d="M22 4L12 14l-3-3" />
      </svg>
    )
  }
  if (status === 'error') {
    return (
      <svg {...STATUS_ICON_PROPS}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    )
  }
  return (
    <svg {...STATUS_ICON_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function QueuePage({
  items,
  onCancel,
  onClearCompleted,
  onClearAll,
  onRetry,
  onRetryAll,
  onGoHome,
  showToast
}: QueuePageProps): React.JSX.Element {
  const downloading = items.filter((i) => i.status === 'downloading')
  const queuedIds = items.filter((i) => i.status === 'queued').map((i) => i.id)
  const failedCount = items.filter((i) => i.status === 'error').length
  const finishedCount = items.filter(
    (i) => i.status === 'completed' || i.status === 'error'
  ).length
  const overall =
    downloading.length > 0
      ? downloading.reduce((sum, i) => sum + (i.progress?.percent || 0), 0) /
        downloading.length
      : 0

  const handleShowInFolder = async (filename?: string): Promise<void> => {
    if (!filename) return
    try {
      const result = await window.api.showInFolder(filename)
      if (result && !result.ok) {
        showToast(result.openedFolder ? 'info' : 'error', result.error || 'Could not open folder.')
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not open folder.')
    }
  }

  return (
    <div className="page queue-page">
      <div className="page-header">
        <h1 className="page-title">Downloads</h1>
        <div className="queue-header-actions">
          {failedCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={onRetryAll}>
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
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" />
              </svg>
              Retry failed ({failedCount})
            </button>
          )}
          {finishedCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={onClearCompleted}>
              Clear Completed
            </button>
          )}
          {items.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={onClearAll}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {downloading.length > 0 && (
        <div className="queue-summary">
          <div className="queue-summary-top">
            <span>
              {downloading.length} downloading
              {queuedIds.length > 0 && ` · ${queuedIds.length} queued`}
            </span>
            <span className="queue-summary-percent">{overall.toFixed(0)}%</span>
          </div>
          <div className="queue-progress-track">
            <div className="queue-progress-fill" style={{ width: `${overall}%` }} />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-state home-hero">
          <div className="hero-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 16.5V18a3 3 0 003 3h12a3 3 0 003-3v-1.5M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2>No downloads yet</h2>
          <p>Paste a link on the Home tab and your downloads will show up here.</p>
          <button className="btn btn-primary" onClick={onGoHome}>
            Paste a link
          </button>
        </div>
      ) : (
        <div className="queue-list">
          {items.map((item) => {
            const progress = item.progress
            const percent = progress?.percent || 0
            const merging =
              item.status === 'downloading' && progress?.status === 'merging'
            const position = queuedIds.indexOf(item.id) + 1
            return (
              <div key={item.id} className={`queue-item status-${item.status} animate-in`}>
                <span
                  className={`queue-status-icon is-${item.status}`}
                  aria-hidden="true"
                >
                  <StatusIcon status={item.status} />
                </span>
                <div className="queue-item-main">
                  <div className="queue-item-row">
                    <span
                      className="queue-item-title"
                      title={item.status === 'completed' ? item.filename : item.url}
                    >
                      {primaryText(item)}
                    </span>
                    <span className="queue-item-quality">{item.quality}</span>
                    {item.status === 'completed' && item.filename && (
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => void handleShowInFolder(item.filename)}
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
                    )}
                    {item.status === 'error' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onRetry(item.id)}
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
                          <path d="M23 4v6h-6M1 20v-6h6" />
                          <path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" />
                        </svg>
                        Retry
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-icon queue-cancel"
                      onClick={() => onCancel(item.id)}
                      title={item.status === 'queued' || item.status === 'downloading' ? 'Cancel' : 'Remove'}
                      aria-label={item.status === 'queued' || item.status === 'downloading' ? 'Cancel download' : 'Remove from queue'}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </button>
                  </div>

                  {item.status === 'queued' && (
                    <div className="queue-queued-text">Queued · #{position} in line</div>
                  )}

                  {item.status === 'downloading' && (
                    <div className="queue-progress">
                      <div className="queue-progress-track">
                        <div
                          className={`queue-progress-fill${merging ? ' is-merging' : ''}`}
                          style={{ width: `${merging ? 100 : percent}%` }}
                        />
                      </div>
                      <div className="queue-progress-text">
                        {merging ? (
                          <span className="queue-merging">Merging formats…</span>
                        ) : (
                          <span>
                            {percent.toFixed(1)}%
                            {progress.speed && ` · ${progress.speed}`}
                            {progress.eta && ` · ETA ${progress.eta}`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {item.status === 'completed' && item.filename && (
                    <div className="queue-saved-path" title={item.filename}>
                      {item.filename}
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="queue-error-text">{item.error || 'Download failed'}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default QueuePage
