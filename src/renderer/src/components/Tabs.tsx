import { useEffect, useRef, useState } from 'react'
import type { TabId } from '../App'

interface TabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  queueCount: number
}

const TAB_ORDER: TabId[] = ['home', 'queue', 'history', 'settings']

const ICON_PROPS = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    )
  },
  {
    id: 'queue',
    label: 'Queue',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
    )
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    )
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
        <path d="M1 14h6M9 8h6M17 16h6" />
      </svg>
    )
  }
]

function Tabs({ activeTab, onTabChange, queueCount }: TabsProps): React.JSX.Element {
  const navRef = useRef<HTMLElement | null>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false })

  useEffect(() => {
    const update = (): void => {
      const nav = navRef.current
      if (!nav) return
      const active = nav.querySelector('.tab.active') as HTMLElement | null
      if (!active) {
        setIndicator((prev) => ({ ...prev, visible: false }))
        return
      }
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth, visible: true })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeTab, queueCount])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const index = TAB_ORDER.indexOf(activeTab)
    const next =
      e.key === 'ArrowRight'
        ? TAB_ORDER[(index + 1) % TAB_ORDER.length]
        : TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length]
    onTabChange(next)
  }

  return (
    <nav ref={navRef} className="tabs" onKeyDown={handleKeyDown} aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="tab-icon" aria-hidden="true">
            {tab.icon}
          </span>
          {tab.label}
          {tab.id === 'queue' && queueCount > 0 && (
            <span key={queueCount} className="tab-badge tab-badge-pop">
              {queueCount}
            </span>
          )}
        </button>
      ))}
      <span
        className="tab-indicator"
        aria-hidden="true"
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: indicator.width,
          opacity: indicator.visible ? 1 : 0
        }}
      />
    </nav>
  )
}

export default Tabs
