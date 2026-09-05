import { useState } from 'react'

interface SingleVideoCardProps {
  title: string
  thumbnail: string
  duration: number
  channel: string
  quality: string
  onQualityChange: (quality: string) => void
  onDownload: () => void
}

const QUALITIES = [
  { id: 'best', label: 'Best' },
  { id: '1080p', label: '1080p' },
  { id: '720p', label: '720p' },
  { id: '480p', label: '480p' },
  { id: '360p', label: '360p' },
  { id: 'audio', label: 'Audio Only' }
]

function formatDuration(seconds: number): string {
  if (!seconds) return 'N/A'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function SingleVideoCard({
  title,
  thumbnail,
  duration,
  channel,
  quality,
  onQualityChange,
  onDownload
}: SingleVideoCardProps): React.JSX.Element {
  const [downloading, setDownloading] = useState(false)

  return (
    <div className="video-card animate-in">
      <div className="video-card-thumb">
        {thumbnail ? (
          <img src={thumbnail} alt={title} loading="lazy" />
        ) : (
          <div className="video-thumb-placeholder" />
        )}
        {duration > 0 && (
          <span className="video-duration-badge">{formatDuration(duration)}</span>
        )}
      </div>
      <div className="video-card-info">
        <h2 className="video-card-title" title={title}>
          {title}
        </h2>
        <p className="video-card-meta">
          {channel} · {formatDuration(duration)}
        </p>
        <div className="video-card-actions">
          <label className="quality-inline">
            <span>Quality</span>
            <select
              className="select"
              value={quality}
              onChange={(e) => onQualityChange(e.target.value)}
            >
              {QUALITIES.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn btn-primary"
            onClick={() => {
              setDownloading(true)
              onDownload()
              setTimeout(() => setDownloading(false), 0)
            }}
            disabled={downloading}
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
            Download
          </button>
        </div>
      </div>
    </div>
  )
}

export default SingleVideoCard
