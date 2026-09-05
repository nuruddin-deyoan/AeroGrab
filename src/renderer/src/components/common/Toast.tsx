interface ToastProps {
  type: 'success' | 'error' | 'info'
  message: string
}

function Toast({ type, message }: ToastProps): React.JSX.Element {
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">
        {type === 'success' && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 7l4 4 8-8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {type === 'error' && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
        {type === 'info' && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 6v4M7 4v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <span className="toast-message">{message}</span>
    </div>
  )
}

export default Toast
