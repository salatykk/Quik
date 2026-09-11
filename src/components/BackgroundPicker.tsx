import { useState } from 'react'
import { WidgetBackground } from '../types'
import { isVideoPath } from './BackgroundLayer'
import './BackgroundPicker.css'

interface Props {
  value: WidgetBackground | undefined
  onChange: (bg: WidgetBackground) => void
}

const TYPES: { id: WidgetBackground['type']; label: string; icon: React.ReactNode }[] = [
  {
    id: 'none',
    label: 'Нет',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  },
  {
    id: 'color',
    label: 'Цвет',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    id: 'image',
    label: 'Картинка',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="9" r="1.6" /><path d="M21 15l-5-5L5 21" />
      </svg>
    )
  },
  {
    id: 'video',
    label: 'Видео',
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="4" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
]

export default function BackgroundPicker({ value, onChange }: Props) {
  const bg = value && value.type !== 'none' ? value : undefined

  const set = (patch: Partial<WidgetBackground>) => {
    onChange({ type: bg?.type ?? 'none', value: bg?.value, opacity: bg?.opacity ?? 1, fit: bg?.fit ?? 'cover', ...patch })
  }

  const pickFile = async () => {
    const p = await window.quik?.pickMedia()
    if (!p) return
    const videos = ['mp4', 'webm', 'mkv', 'mov', 'm4v', 'avi']
    const ext = p.split('.').pop()?.toLowerCase() || ''
    if (videos.includes(ext) || isVideoPath(p)) {
      set({ type: 'video', value: p })
    } else {
      set({ type: 'image', value: p })
    }
  }

  const fileName = bg && bg.value ? bg.value.split(/[\\/]/).pop() : ''

  return (
    <div className="bg-picker">
      <div className="bg-type-row">
        {TYPES.map(t => (
          <button
            key={t.id}
            className={`bg-type ${(bg ? bg.type : 'none') === t.id ? 'active' : ''}`}
            onClick={() => {
              if (t.id === 'none') onChange({ type: 'none', opacity: 1, fit: 'cover' })
              else onChange({ type: t.id, value: t.id === 'color' ? '#1a1d29' : bg?.value, opacity: bg?.opacity ?? 1, fit: bg?.fit ?? 'cover' })
            }}
          >
            <span className="bg-type-ic">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {bg?.type === 'color' && (
        <div className="bg-field bg-field-row">
          <label className="color-field bg-color-field">
            <span>Цвет</span>
            <input type="color" value={bg.value || '#1a1d29'} onChange={e => set({ value: e.target.value })} />
          </label>
        </div>
      )}

      {(bg?.type === 'image' || bg?.type === 'video') && (
        <>
          <div className="bg-field bg-file-row">
            <div className="bg-file-meta">
              <span className="bg-file-name" title={fileName}>{fileName || 'Файл не выбран'}</span>
              <span className="bg-file-hint">{bg?.type === 'video' ? 'Видео / GIF' : 'Изображение'}</span>
            </div>
            <button className="btn btn-primary bg-file-btn" onClick={pickFile}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Выбрать
            </button>
          </div>

          <div className="bg-field">
            <div className="bg-label-row">
              <span className="bg-label">Непрозрачность</span>
              <span className="bg-label-val">{Math.round((bg?.opacity ?? 1) * 100)}%</span>
            </div>
            <input
              className="slider"
              type="range"
              min={20}
              max={100}
              value={Math.round((bg?.opacity ?? 1) * 100)}
              onChange={e => set({ opacity: Number(e.target.value) / 100 })}
            />
          </div>

          <div className="bg-field">
            <span className="bg-label">Масштаб</span>
            <div className="bg-fit-row">
              {(['cover', 'contain', 'fill'] as const).map(f => (
                <button key={f} className={`bg-fit ${(bg?.fit || 'cover') === f ? 'active' : ''}`} onClick={() => set({ fit: f })}>
                  {f === 'cover' ? 'Заполнить' : f === 'contain' ? 'Вписать' : 'Растянуть'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}