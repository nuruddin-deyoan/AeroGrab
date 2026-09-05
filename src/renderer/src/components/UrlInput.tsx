import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react'

interface UrlInputProps {
  onFetch: (urls: string[]) => void
  loading: boolean
}

function countUrls(text: string): number {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).length
}

function UrlInput({ onFetch, loading }: UrlInputProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  const urlCount = countUrls(value)

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  const submit = (): void => {
    if (!value.trim() || loading) return
    const lines = value.split('\n').map((l) => l.trim()).filter(Boolean)
    onFetch(lines)
  }

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handlePaste = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setValue((prev) => (prev.trim() ? `${prev.trim()}\n${text.trim()}` : text.trim()))
      }
    } catch {
      // clipboard unavailable — user can paste manually
    }
    areaRef.current?.focus()
  }

  const handleClear = (): void => {
    setValue('')
    areaRef.current?.focus()
  }

  return (
    <form className="url-input" onSubmit={handleSubmit}>
      <svg
        className="url-input-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
      <textarea
        ref={areaRef}
        rows={1}
        className="url-input-field"
        placeholder="Paste a YouTube link…  (Enter to fetch, Shift+Enter for a new line)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        autoFocus
      />
      {value && !loading && (
        <button
          type="button"
          className="url-clear-btn"
          onClick={handleClear}
          title="Clear"
          aria-label="Clear input"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {urlCount > 1 && <span className="url-count-pill">{urlCount} URLs</span>}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={handlePaste}
        disabled={loading}
        title="Paste from clipboard"
      >
        Paste
      </button>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || !value.trim()}
      >
        {loading ? (
          <span className="spinner" />
        ) : (
          <svg
            width="14"
            height="14"
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
        )}
        Fetch
      </button>
    </form>
  )
}

export default UrlInput
