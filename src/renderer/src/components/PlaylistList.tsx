import { useState, useMemo } from 'react'
import type { PlaylistVideo } from '../types'

interface PlaylistListProps {
  videos: PlaylistVideo[]
  title: string
  quality: string
  onQualityChange: (quality: string) => void
  onDownload: (urls: string[]) => void
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

function PlaylistList({
  videos,
  title,
  quality,
  onQualityChange,
  onDownload
}: PlaylistListProps): React.JSX.Element {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(videos.map((v) => v.index))
  )
  const [rangeFrom, setRangeFrom] = useState('1')
  const [rangeTo, setRangeTo] = useState(String(videos.length || ''))
  const [filter, setFilter] = useState('')

  const allSelected = useMemo(
    () => selected.size === videos.length && videos.length > 0,
    [selected, videos.length]
  )

  const visibleVideos = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return videos
    return videos.filter((v) => v.title.toLowerCase().includes(q))
  }, [videos, filter])

  const toggleAll = (): void => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(videos.map((v) => v.index)))
    }
  }

  const toggleOne = (index: number): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const applyRange = (): void => {
    const from = parseInt(rangeFrom, 10)
    const to = parseInt(rangeTo, 10)
    if (isNaN(from) || isNaN(to)) return
    const next = new Set<number>()
    for (const v of videos) {
      if (v.index >= from && v.index <= to) {
        next.add(v.index)
      }
    }
    setSelected(next)
  }

  const selectedUrls = useMemo(() => {
    return videos.filter((v) => selected.has(v.index)).map((v) => v.url)
  }, [videos, selected])

  const selectedVideos = videos.filter((v) => selected.has(v.index))

  return (
    <div className="playlist animate-in">
      <div className="playlist-header">
        <h2 className="playlist-title">{title}</h2>
        <span className="playlist-count">{videos.length} videos</span>
      </div>

      <div className="playlist-toolbar">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="checkbox"
          />
          <span className="checkbox-text">Select All</span>
        </label>
        <div className="playlist-range">
          <input
            type="number"
            className="input-sm"
            value={rangeFrom}
            min={1}
            max={videos.length}
            onChange={(e) => setRangeFrom(e.target.value)}
          />
          <span>to</span>
          <input
            type="number"
            className="input-sm"
            value={rangeTo}
            min={1}
            max={videos.length}
            onChange={(e) => setRangeTo(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={applyRange}>
            Apply
          </button>
        </div>
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
            placeholder="Filter videos…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <button
              className="playlist-filter-clear"
              onClick={() => setFilter('')}
              title="Clear filter"
              aria-label="Clear filter"
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
        <span className="playlist-selected-count">
          {selected.size} of {videos.length} selected
        </span>
        <div className="playlist-spacer" />
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
        <button
          className="btn btn-primary"
          disabled={selectedUrls.length === 0}
          onClick={() => onDownload(selectedUrls)}
        >
          Download ({selectedUrls.length})
        </button>
      </div>

      <div className="playlist-table">
        <div className="playlist-row playlist-row-header">
          <div className="playlist-col-check">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="checkbox"
            />
          </div>
          <div className="playlist-col-index">#</div>
          <div className="playlist-col-thumb" />
          <div className="playlist-col-title">Title</div>
          <div className="playlist-col-duration">Duration</div>
        </div>

        {visibleVideos.map((video) => (
          <div
            key={video.index}
            className={`playlist-row playlist-row-item ${selected.has(video.index) ? 'selected' : ''}`}
            onClick={() => toggleOne(video.index)}
          >
            <div className="playlist-col-check">
              <input
                type="checkbox"
                checked={selected.has(video.index)}
                onChange={(e) => {
                  e.stopPropagation()
                  toggleOne(video.index)
                }}
                className="checkbox"
              />
            </div>
            <div className="playlist-col-index">{video.index}</div>
            <div className="playlist-col-thumb">
              {video.thumbnail ? (
                <img src={video.thumbnail} alt="" loading="lazy" />
              ) : (
                <div className="video-thumb-placeholder" />
              )}
            </div>
            <div className="playlist-col-title">{video.title}</div>
            <div className="playlist-col-duration">{formatDuration(video.duration)}</div>
          </div>
        ))}
        {visibleVideos.length === 0 && (
          <div className="playlist-empty-filter">No videos match “{filter}”.</div>
        )}
      </div>
    </div>
  )
}

export default PlaylistList
