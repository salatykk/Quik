import { useEffect, useRef, useState } from 'react'
import { WidgetType } from '../types'
import { useStore } from '../store'
import ClockContent from '../components/widgets/ClockContent'
import WeatherContent from '../components/widgets/WeatherContent'
import CryptoContent from '../components/widgets/CryptoContent'
import MusicContent from '../components/widgets/MusicContent'
import MapsContent from '../components/widgets/MapsContent'
import WelcomeOverlay from '../components/WelcomeOverlay'
import { themeVars } from '../themeVars'
import './WidgetView.css'

const CONTENT: Record<WidgetType, React.ComponentType> = {
  clock: ClockContent,
  weather: WeatherContent,
  crypto: CryptoContent,
  music: MusicContent,
  maps: MapsContent
}

interface Props {
  type: WidgetType
}

interface MenuState {
  x: number
  y: number
}

export default function WidgetWindow({ type }: Props) {
  const { settings, dispatch } = useStore()
  const [welcomeDone, setWelcomeDone] = useState(false)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const config = settings.widgets.find(w => w.type === type)
  const theme = settings.theme
  const Content = CONTENT[type]

  const gesture = useRef<{ mode: 'drag' | 'resize' | null }>({ mode: null })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!config) return
    window.quik?.widgetSetVisible(type, config.enabled)
  }, [config?.enabled, type])

  const appliedScale = useRef(false)
  useEffect(() => {
    if (appliedScale.current) {
      window.quik?.widgetSetScale(type, settings.widgetScale)
      return
    }
    appliedScale.current = true
    const p = window.quik?.widgetCustomized(type)
    if (p) {
      p.then(customized => {
        if (!customized) window.quik?.widgetSetScale(type, settings.widgetScale)
      }).catch(() => {})
    }
  }, [settings.widgetScale, type])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const showWelcome = type === 'clock' && settings.isFirstLaunch && !welcomeDone

  if (!config || !Content) return null

  const vars = themeVars(theme, config)

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    setMenu({
      x: Math.max(4, Math.min(e.clientX + 2, el.offsetWidth - 170)),
      y: Math.max(4, Math.min(e.clientY + 2, el.offsetHeight - 130))
    })
  }

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (showWelcome) return
    const t = e.target as HTMLElement
    if (t.closest('button, input, a, [data-nodrag]')) return
    if (!config.enabled) return
    gesture.current.mode = 'drag'
    e.currentTarget.setPointerCapture(e.pointerId)
    window.quik?.widgetDragStart(type, e.screenX, e.screenY)
  }

  const moveDrag = (e: React.PointerEvent) => {
    if (gesture.current.mode === 'drag') {
      window.quik?.widgetDragMove(type, e.screenX, e.screenY)
    } else if (gesture.current.mode === 'resize') {
      window.quik?.widgetResize(type, e.screenX, e.screenY)
    }
  }

  const endDrag = (e: React.PointerEvent) => {
    if (gesture.current.mode === 'drag') {
      window.quik?.widgetDragEnd(type)
    } else if (gesture.current.mode === 'resize') {
      window.quik?.widgetResizeEnd(type)
    }
    gesture.current.mode = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation()
    if (e.button !== 0) return
    gesture.current.mode = 'resize'
    e.currentTarget.setPointerCapture(e.pointerId)
    window.quik?.widgetResizeStart(type, e.screenX, e.screenY)
  }

  const openOverlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.quik?.openOverlay()
  }

  const hideWidget = () => {
    dispatch({ type: 'UPDATE_WIDGET', payload: { id: config.id, changes: { enabled: false } } })
  }

  const menuActions: { label: string; icon: React.ReactNode; onClick: () => void }[] = [
    {
      label: 'Открыть Quik',
      icon: <QuestIcon />,
      onClick: () => window.quik?.openOverlay()
    },
    {
      label: 'Настройки',
      icon: <GearIcon />,
      onClick: () => window.quik?.openOverlay('settings')
    },
    {
      label: 'Скрыть виджет',
      icon: <EyeOffIcon />,
      onClick: hideWidget
    }
  ]

  return (
    <div
      ref={menuRef}
      className="widget-window"
      style={{
        ...vars,
        opacity: config.opacity,
        zoom: settings.widgetScale * 100 + '%',
        ...(config.font ? { ['--widget-font' as string]: config.font } : {})
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onContextMenu={openMenu}
    >
      <div className="card w-card">
        <Content />
      </div>

      {showWelcome && <WelcomeOverlay onDone={() => { setWelcomeDone(true); dispatch({ type: 'SET_FIRST_LAUNCH_DONE' }) }} />}

      <button className="widget-menu-btn" data-nodrag onClick={openOverlay} title="Открыть Quik">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      <div className="widget-resize-handle" data-nodrag onPointerDown={startResize}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M22 3L3 22M22 12L12 22M22 3v4M15 22h-5M3 22v-5" />
        </svg>
      </div>

      {menu && (
        <div className="widget-menu" style={{ left: menu.x, top: menu.y }} onClick={e => e.stopPropagation()} data-nodrag>
          {menuActions.map(a => (
            <button key={a.label} className="widget-menu-item" onClick={() => { a.onClick(); setMenu(null) }}>
              <span className="widget-menu-ic">{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestIcon() {
  return (
    <svg className="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="6" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg className="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg className="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}