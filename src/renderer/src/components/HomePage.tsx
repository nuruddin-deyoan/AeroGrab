import { useState, useCallback, useEffect } from 'react'
import UrlInput from './UrlInput'
import SingleVideoCard from './SingleVideoCard'
import PlaylistList from './PlaylistList'
import type { Detection, PlaylistVideo as PlaylistVideoType, AppSettings } from '../types'

interface HomePageProps {
  settings: AppSettings
  onDownload: (urls: string[], quality: string) => void
}

const MULTI_QUALITIES = [
  { id: 'best', label: 'Best' },
  { id: '1080p', label: '1080p' },
  { id: '720p', label: '720p' },
  { id: '480p', label: '480p' },
  { id: '360p', label: '360p' },
  { id: 'audio', label: 'Audio Only' }
]

const TYPE_ICON_PROPS = {
  width: 12,
  height: 12,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const

function TypeIcon({ type }: { type: Detection['type'] }): React.JSX.Element | null {
  switch (type) {
    case 'single':
      return (
        <svg {...TYPE_ICON_PROPS}>
          <circle cx="12" cy="12" r="10" />
          <path d="M10 8l6 4-6 4z" />
        </svg>
      )
    case 'playlist':
      return (
        <svg {...TYPE_ICON_PROPS}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <path d="M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      )
    case 'channel':
      return (
        <svg {...TYPE_ICON_PROPS}>
          <circle cx="12" cy="12" r="2" />
          <path d="M7.5 7.5a6.4 6.4 0 000 9M16.5 7.5a6.4 6.4 0 010 9M4.9 4.9a10 10 0 000 14.2M19.1 4.9a10 10 0 010 14.2" />
        </svg>
      )
    case 'multi':
      return (
        <svg {...TYPE_ICON_PROPS}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      )
    default:
      return null
  }
}

function HomePage({ settings, onDownload }: HomePageProps): React.JSX.Element {
  const [detection, setDetection] = useState<Detection | null>(null)
  const [singleInfo, setSingleInfo] = useState<
    { title: string; thumbnail: string; duration: number; channel: string } | null
  >(null)
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideoType[]>([])
  const [loadedType, setLoadedType] = useState<Detection['type'] | null>(null)
  const [quality, setQuality] = useState(settings.quality)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchMessage, setFetchMessage] = useState<string | null>(null)
  const [lastUrls, setLastUrls] = useState<string[]>([])

  useEffect(() => {
    setQuality(settings.quality)
  }, [settings.quality])

  useEffect(() => {
    return window.api.onFetchProgress((msg) => setFetchMessage(msg))
  }, [])

  const handleFetch = useCallback(
    async (urls: string[]) => {
      setLoading(true)
      setError(null)
      setFetchMessage(null)
      setLastUrls(urls)
      setDetection(null)
      setSingleInfo(null)
      setPlaylistVideos([])
      setLoadedType(null)
      try {
        const detectionResult = await window.api.detectUrls(urls)
        setDetection(detectionResult)

        if (detectionResult.type === 'single') {
          setLoadedType('single')
          const info = await window.api.fetchVideoInfo(detectionResult.urls[0])
          setSingleInfo({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            channel: info.channel
          })
          setPlaylistVideos([])
        } else if (
          detectionResult.type === 'playlist' ||
          detectionResult.type === 'channel'
        ) {
          setLoadedType(detectionResult.type)
          setSingleInfo(null)
          const videos = await window.api.fetchPlaylist(detectionResult.urls[0])
          setPlaylistVideos(videos)
        } else if (detectionResult.type === 'multi') {
          setLoadedType('multi')
          setSingleInfo(null)
          setPlaylistVideos([])
        } else {
          setError('Could not detect a valid YouTube URL. Please check and try again.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch information')
      } finally {
        setLoading(false)
        setFetchMessage(null)
      }
    },
    []
  )

  const handleDownloadSingle = useCallback(() => {
    if (detection?.urls[0]) {
      onDownload([detection.urls[0]], quality)
    }
  }, [detection, quality, onDownload])

  const handleDownloadPlaylist = useCallback(
    (urls: string[]) => {
      onDownload(urls, quality)
    },
    [quality, onDownload]
  )

  const handleRemoveUrl = useCallback((index: number) => {
    setDetection((prev) =>
      prev ? { ...prev, urls: prev.urls.filter((_, i) => i !== index) } : prev
    )
  }, [])

  const handleRetry = useCallback(() => {
    if (lastUrls.length > 0) {
      void handleFetch(lastUrls)
    }
  }, [handleFetch, lastUrls])

  return (
    <div className="page home-page">
      <UrlInput onFetch={handleFetch} loading={loading} />

      {error && (
        <div className="error-card" role="alert">
          <span className="error-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <div className="error-card-body">
            <p className="error-card-title">Something went wrong</p>
            <p className="error-card-msg">{error}</p>
          </div>
          {lastUrls.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleRetry}>
              Try again
            </button>
          )}
        </div>
      )}

      {loading && fetchMessage && !error && (
        <div className="fetch-progress-text">{fetchMessage}</div>
      )}

      {loading && (
        <div className="skeleton-card" aria-hidden="true">
          <div className="skeleton-thumb shimmer" />
          <div className="skeleton-lines">
            <div className="shimmer" />
            <div className="shimmer" />
            <div className="shimmer short" />
          </div>
        </div>
      )}

      {detection && !error && (
        <div className="url-type-badge animate-in">
          <TypeIcon type={detection.type} />
          <span>
            {detection.type === 'single' && 'Single Video'}
            {detection.type === 'playlist' &&
              (detection.count ? `Playlist · ${detection.count} videos` : 'Playlist')}
            {detection.type === 'channel' &&
              (detection.count ? `Channel · ${detection.count} videos` : 'Channel')}
            {detection.type === 'multi' && `${detection.urls.length} videos queued`}
          </span>
        </div>
      )}

      {loadedType === 'single' && singleInfo && (
        <SingleVideoCard
          title={singleInfo.title}
          thumbnail={singleInfo.thumbnail}
          duration={singleInfo.duration}
          channel={singleInfo.channel}
          quality={quality}
          onQualityChange={setQuality}
          onDownload={handleDownloadSingle}
        />
      )}

      {loadedType === 'multi' && detection && (
        <div className="multi-info animate-in">
          <div className="multi-info-head">
            <p>
              Detected <strong>{detection.urls.length}</strong> video URL(s). Ready to
              download.
            </p>
            <label className="quality-inline">
              <span>Quality</span>
              <select
                className="select"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                {MULTI_QUALITIES.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {detection.urls.length > 0 ? (
            <ul className="multi-url-list">
              {detection.urls.map((url, i) => (
                <li key={`${i}-${url}`} className="multi-url-item">
                  <span className="multi-url-text" title={url}>
                    {url}
                  </span>
                  <button
                    className="btn btn-ghost btn-icon multi-url-remove"
                    onClick={() => handleRemoveUrl(i)}
                    title="Remove"
                    aria-label={`Remove ${url}`}
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
                </li>
              ))}
            </ul>
          ) : (
            <p className="multi-empty">All URLs removed. Paste new links above to start again.</p>
          )}
          <button
            className="btn btn-primary"
            disabled={detection.urls.length === 0}
            onClick={() => onDownload(detection.urls, quality)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            Download All ({detection.urls.length})
          </button>
        </div>
      )}

      {loadedType === 'playlist' && detection && (
        <PlaylistList
          videos={playlistVideos}
          title={detection.title || 'Playlist'}
          quality={quality}
          onQualityChange={setQuality}
          onDownload={handleDownloadPlaylist}
        />
      )}

      {loadedType === 'channel' && detection && (
        <PlaylistList
          videos={playlistVideos}
          title={`${detection.title || 'Channel'} Videos`}
          quality={quality}
          onQualityChange={setQuality}
          onDownload={handleDownloadPlaylist}
        />
      )}

      {!detection && !error && !loading && (
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
          <h2>Paste a YouTube URL to start</h2>
          <p>Single videos, playlists, channels — or paste many links at once.</p>
          <div className="hero-steps">
            <div className="hero-step">
              <span className="hero-step-num">1</span>
              <span>Paste link</span>
            </div>
            <div className="hero-step">
              <span className="hero-step-num">2</span>
              <span>Pick quality</span>
            </div>
            <div className="hero-step">
              <span className="hero-step-num">3</span>
              <span>Download</span>
            </div>
          </div>
          <div className="hero-chips">
            <span className="hero-chip">Single video</span>
            <span className="hero-chip">Playlist</span>
            <span className="hero-chip">Channel</span>
            <span className="hero-chip">Bulk URLs</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
