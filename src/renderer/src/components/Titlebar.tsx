import { useEffect, useState } from 'react'

interface TitlebarProps {
  activeCount?: number
}

function Titlebar({ activeCount = 0 }: TitlebarProps): React.JSX.Element {
  const busy = activeCount > 0
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.api
      .isMaximized()
      .then(setMaximized)
      .catch(() => undefined)
    const unsubscribe = window.api.onMaximizedChange(setMaximized)
    return () => unsubscribe()
  }, [])

  const toggleMaximize = (): void => {
    window.api.maximizeToggle()
  }

  return (
    <div
      className={`titlebar${busy ? ' is-busy' : ''}`}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('.titlebar-controls')) return
        toggleMaximize()
      }}
    >
      <div className="titlebar-left">
        <span className="titlebar-logo" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="yt-titlebar-logo" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#4ADE80" />
                <stop offset="1" stopColor="#16A34A" />
              </linearGradient>
            </defs>
            <rect
              x="1.5"
              y="1.5"
              width="21"
              height="21"
              rx="6"
              fill="url(#yt-titlebar-logo)"
            />
            <path d="M10 8.5l6 3.5-6 3.5z" fill="#fff" />
          </svg>
        </span>
        <span className="titlebar-text">AeroGrab</span>
        <span className="titlebar-version">v1.0.0</span>
      </div>
      <div className={`titlebar-status${busy ? ' is-active' : ''}`} aria-hidden={!busy}>
        <span className="titlebar-status-dot" />
        <span className="titlebar-status-text">
          {busy
            ? activeCount === 1
              ? 'Downloading 1 file'
              : `Downloading ${activeCount} files`
            : 'Idle'}
        </span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-btn"
          onClick={() => window.api.minimize()}
          title="Minimize"
          aria-label="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5.5" width="10" height="1.2" fill="currentColor" />
          </svg>
        </button>
        <button
          className="titlebar-btn"
          onClick={toggleMaximize}
          title={maximized ? 'Restore' : 'Maximize'}
          aria-label={maximized ? 'Restore window' : 'Maximize window'}
        >
          {maximized ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <rect x="1.5" y="3.5" width="6" height="6" />
              <path d="M3.5 3.5v-2h7v7h-2" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <rect x="1.5" y="1.5" width="9" height="9" />
            </svg>
          )}
        </button>
        <button
          className="titlebar-btn titlebar-close"
          onClick={() => window.api.close()}
          title="Close"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default Titlebar
