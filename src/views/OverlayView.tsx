import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { QuickAccessApp } from '../types'
import ClockContent from '../components/widgets/ClockContent'
import WeatherContent from '../components/widgets/WeatherContent'
import CryptoContent from '../components/widgets/CryptoContent'
import MusicContent from '../components/widgets/MusicContent'
import MapsContent from '../components/widgets/MapsContent'
import AccountPanel from '../components/AccountPanel'
import SettingsPanel from '../components/SettingsPanel'
import QuickAccessPanel from '../components/QuickAccessPanel'
import { themeVars } from '../themeVars'
import './OverlayView.css'

type Panel = null | 'account' | 'settings'

interface HostedApp {
  app: QuickAccessApp
  kind: 'web' | 'exe'
}

interface Props {
  version?: string
}

export default function OverlayView({ version = '' }: Props) {
  const { settings } = useStore()
  const theme = settings.theme
  const [panel, setPanel] = useState<Panel>(null)
  const [hosted, setHosted] = useState<HostedApp | null>(null)
  const [ver, setVer] = useState(version)
  const vars = themeVars(theme, undefined, 16)

  useEffect(() => {
    window.quik?.getAppVersion().then(setVer)
  }, [])

  useEffect(() => {
    window.quik?.onOverlayPanel(panel => setPanel(panel))
    window.quik?.getStartPanel().then(p => { if (p) setPanel(p) })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hosted) setHosted(null)
        else if (panel) setPanel(null)
        else window.quik?.closeOverlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, hosted])

  const launch = (app: QuickAccessApp) => {
    if (app.url) setHosted({ app, kind: 'web' })
    else if (app.path) setHosted({ app, kind: 'exe' })
  }

  const toggle = (p: Panel) => setPanel(prev => (prev === p ? null : p))
  const widgets = settings.widgets.filter(w => w.enabled)
  const date = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="ov" style={vars}>
      <div className="ov-bg" />

      {hosted ? (
        <AppHost hosted={hosted} onClose={() => setHosted(null)} />
      ) : panel ? (
        <div className="modal-wrap" onClick={() => setPanel(null)}>
          <div className="modal-fade" onClick={() => setPanel(null)} />
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            {panel === 'account' && <AccountPanel onClose={() => setPanel(null)} />}
            {panel === 'settings' && <SettingsPanel onClose={() => setPanel(null)} />}
          </div>
        </div>
      ) : (
        <div className="ov-shell">
          <header className="topbar anim-fade">
            <div className="brand">
              <span className="brand-mark">Q</span>
              <span className="brand-name">Quik</span>
              <span className="brand-tag">workstation</span>
            </div>

            <div className="topbar-right">
              {settings.account ? (
                <button className="tb-account" onClick={() => toggle('account')}>
                  <span className="tb-avatar">
                    {settings.account.avatar ? (
                      <img src={settings.account.avatar} alt="" />
                    ) : (
                      <span>{settings.account.nickname[0].toUpperCase()}</span>
                    )}
                  </span>
                  <span className="tb-account-name">{settings.account.nickname}</span>
                </button>
              ) : (
                <button className="tb-btn" onClick={() => toggle('account')}>
                  <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Quik ID</span>
                </button>
              )}

              <button className="tb-btn" onClick={() => toggle('settings')}>
                <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Настройки</span>
              </button>

              <button className="tb-btn tb-close" onClick={() => window.quik?.closeOverlay()}>
                <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          <div className="ov-body">
            <aside className="rail anim-slide-right">
              <QuickAccessPanel apps={settings.quickAccessApps} onLaunch={launch} />
            </aside>

            <section className="stage">
              {widgets.length === 0 ? (
                <div className="stage-empty anim-fade-up">
                  <div className="stage-empty-mark">Q</div>
                  <span>Включите виджеты в настройках</span>
                  <button className="btn btn-ghost" onClick={() => toggle('settings')}>Настройки</button>
                </div>
              ) : (
                <div className="widget-grid">
                  {widgets.map((w, i) => (
                    <div key={w.id} className="widget-cell anim-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="card widget-card">
                        {w.type === 'clock' && <ClockContent />}
                        {w.type === 'weather' && <WeatherContent />}
                        {w.type === 'crypto' && <CryptoContent />}
                        {w.type === 'music' && <MusicContent />}
                        {w.type === 'maps' && <MapsContent />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <footer className="statusbar anim-fade">
            <span className="status-item">
              <span className="status-dot" />
              {date}
            </span>
            <span className="status-item tnum">CTRL + SHIFT + TAB — скрыть</span>
            <span className="status-item tnum">v{ver}</span>
          </footer>
        </div>
      )}
    </div>
  )
}

function AppHost({ hosted, onClose }: { hosted: HostedApp; onClose: () => void }) {
  return (
    <div className="app-host-wrap" onClick={onClose}>
      <div className="app-host-card anim-pop" onClick={e => e.stopPropagation()}>
        <div className="app-host-head">
          <span className="app-host-ic">{hosted.app.name[0]?.toUpperCase()}</span>
          <span className="app-host-name">{hosted.app.name}</span>
          <button className="app-host-close" onClick={onClose} title="Закрыть">
            <svg className="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {hosted.kind === 'web' ? (
          <div className="app-host-body">
            <webview className="app-host-web" src={hosted.app.url} allowpopups />
          </div>
        ) : (
          <ExeBody app={hosted.app} />
        )}
      </div>
    </div>
  )
}

function ExeBody({ app }: { app: QuickAccessApp }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'starting' | 'ok' | 'fail'>('starting')
  const [reason, setReason] = useState('')

  useEffect(() => {
    let cancelled = false

    const doLayout = () => {
      const el = bodyRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      window.quik?.layoutApp(
        app.id,
        { x: r.left, y: r.top, width: r.width, height: r.height },
        window.devicePixelRatio
      )
    }

    const t1 = setTimeout(doLayout, 500)
    const t2 = setTimeout(doLayout, 1500)

    window.quik
      ?.embedApp(app.id, app.path ?? '')
      .then(res => {
        if (cancelled) {
          window.quik?.releaseApp(app.id)
          return
        }
        if (res?.ok) {
          setStatus('ok')
          setTimeout(doLayout, 80)
        } else {
          setStatus('fail')
          setReason(res?.reason || 'неизвестная ошибка')
        }
      })

    return () => {
      cancelled = true
      clearTimeout(t1)
      clearTimeout(t2)
      window.quik?.releaseApp(app.id)
    }
  }, [app.id, app.path])

  return (
    <div className="app-host-body" ref={bodyRef}>
      {status !== 'ok' && (
        <div className="app-host-pending">
          <span className="app-host-spinner" />
          <span>{status === 'starting' ? 'Запуск приложения…' : 'Не удалось открыть приложение'}</span>
          {status === 'fail' && <span className="app-host-reason">{reason}</span>}
        </div>
      )}
    </div>
  )
}