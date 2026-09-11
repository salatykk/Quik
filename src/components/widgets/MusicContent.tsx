import { useEffect, useRef, useState } from 'react'
import type { MediaSnapshot } from '../../types'
import './MusicContent.css'

export default function MusicContent() {
  const [snap, setSnap] = useState<MediaSnapshot | null>(null)
  const [pos, setPos] = useState(0)
  const baseRef = useRef<{ pos: number; at: number } | null>(null)

  useEffect(() => {
    let alive = true
    const apply = (s: MediaSnapshot | null) => {
      if (!alive) return
      setSnap(s)
      baseRef.current = s ? { pos: s.pos, at: Date.now() } : null
      if (s) setPos(s.pos)
    }
    window.quik?.getMedia?.().then(s => apply(s)).catch(() => {})
    const off = window.quik?.onMediaUpdate?.(s => apply(s))
    return () => {
      alive = false
      if (off) off()
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      const b = baseRef.current
      if (!b) return
      const elapsed = (Date.now() - b.at) / 1000
      setPos(b.pos + (snap?.status === 'playing' ? elapsed : 0))
    }, 500)
    return () => clearInterval(t)
  }, [snap?.status])

  const playing = snap?.status === 'playing'
  const hasTrack = !!snap && (!!snap.title || !!snap.artist)
  const dur = snap?.dur || 0
  const pct = dur > 0 ? Math.min(100, Math.max(0, (pos / dur) * 100)) : 0

  return (
    <div className="w-music w-content">
      <div className="w-m-head">
        <span className="w-label">Сейчас играет</span>
        {playing && (
          <span className="w-m-eq">
            <i /><i /><i /><i />
          </span>
        )}
      </div>

      {!hasTrack ? (
        <div className="w-m-empty">
          <div className="w-m-empty-ic">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          </div>
          <div className="w-m-empty-t">Нет активного воспроизведения</div>
          <div className="w-m-empty-s">Включите музыку в любом плеере</div>
        </div>
      ) : (
        <>
          <div className="w-m-track">
            <div className="w-m-cover">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div className="w-m-meta">
              <div className="w-m-title" title={snap?.title}>{snap?.title || 'Без названия'}</div>
              <div className="w-m-artist" title={snap?.artist}>{snap?.artist || 'Неизвестный исполнитель'}</div>
            </div>
            <div className="w-m-play w-m-state" title={stateTitle(snap?.status)}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </div>
          </div>

          <div className="w-m-progress">
            <div className="w-m-bar" style={{ width: `${pct}%` }} />
          </div>
          <div className="w-m-times">
            <span className="w-tabular">{fmt(pos)}</span>
            <span className="w-tabular">{fmt(dur)}</span>
          </div>

          <div className="w-divider" />
          <div className="w-m-source">
            <span className="w-m-src-label">Источник</span>
            <span className="w-m-src-name" title={snap?.app}>{prettyApp(snap?.app)}</span>
          </div>
        </>
      )}
    </div>
  )
}

function stateTitle(status?: string): string {
  if (status === 'playing') return 'Играет'
  if (status === 'paused') return 'Пауза'
  if (status === 'stopped') return 'Остановлено'
  return ''
}

function prettyApp(id?: string): string {
  if (!id) return '—'
  let s = id.replace(/\\/g, '/').split('/').pop() || id
  if (s.includes('!')) s = s.split('!').pop() || s
  return s.replace(/\.exe$/i, '')
}

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${ss.toString().padStart(2, '0')}`
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1.2" />
      <rect x="14" y="4" width="4" height="16" rx="1.2" />
    </svg>
  )
}