import { useState } from 'react'
import { useStore } from '../store'
import { QuickAccessApp } from '../types'
import './QuickAccessPanel.css'

interface Props {
  apps: QuickAccessApp[]
  onLaunch: (app: QuickAccessApp) => void
}

const COLORS = ['#34d399', '#7dd3fc', '#a78bfa', '#fb923c', '#f87171', '#facc15']

export default function QuickAccessPanel({ apps, onLaunch }: Props) {
  const { dispatch } = useStore()
  const [editing, setEditing] = useState<QuickAccessApp | null>(null)
  const [urlInput, setUrlInput] = useState('')

  const openAdd = () => {
    setEditing({ id: Date.now().toString(), name: '' })
    setUrlInput('')
  }

  const pickFile = async () => {
    const path = await window.quik?.pickFile()
    if (!path) return
    const name = editing?.name?.trim() || nameFromPath(path)
    setEditing(prev => ({ ...(prev || { id: Date.now().toString(), name: '' }), name, path }))
  }

  const save = () => {
    if (!editing || !editing.name.trim()) return
    const payload: QuickAccessApp = { id: editing.id, name: editing.name.trim() }
    const url = urlInput.trim().replace(/\s+/g, '')
    if (url) {
      payload.url = /^https?:\/\//i.test(url) ? url : `https://${url}`
    } else if (editing.path) {
      payload.path = editing.path
    } else {
      return
    }
    dispatch({ type: 'ADD_QUICK_ACCESS_APP', payload })
    setEditing(null)
  }

  const hasKind = urlInput.trim() || editing?.path

  return (
    <>
      <div className="qa">
        <div className="qa-head">
          <span className="label">Быстрый доступ</span>
          <button className="qa-add" onClick={openAdd} title="Добавить приложение">
            <svg className="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {apps.length === 0 && (
          <div className="qa-empty anim-fade-up">
            <div className="qa-empty-ic">
              <svg className="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <path d="M8 3v18M16 3v18M3 8h18M3 16h18" />
              </svg>
            </div>
            <span>Добавьте приложения,<br />чтобы открывать их в один клик</span>
            <button className="btn btn-ghost" onClick={openAdd}>Добавить</button>
          </div>
        )}

        <div className="qa-list">
          {apps.map((a, i) => (
            <div key={a.id} className="qa-item anim-slide-right" style={{ animationDelay: `${i * 40}ms` }}>
              <button className="qa-item-main" onClick={() => onLaunch(a)}>
                <span className="qa-ic" style={{ background: `${COLORS[i % COLORS.length]}22`, color: COLORS[i % COLORS.length] }}>
                  <IconName name={a.name} />
                </span>
                <span className="qa-name">{a.name}</span>
                {a.url && (
                  <span className="qa-web" title="Откроется внутри оверлея">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
                    </svg>
                  </span>
                )}
              </button>
              <button
                className="qa-del"
                title="Убрать"
                onClick={() => dispatch({ type: 'REMOVE_QUICK_ACCESS_APP', payload: a.id })}
              >
                <svg className="ic" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="qa-modal" onClick={() => setEditing(null)}>
          <div className="qa-modal-card anim-pop" onClick={e => e.stopPropagation()}>
            <h4 className="qa-modal-title">Название</h4>
            <div className="field">
              <input defaultValue={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} autoFocus />
            </div>

            <h4 className="qa-modal-title">
              Ссылка <span className="qa-modal-hint">откроется внутри оверлея</span>
            </h4>
            <div className="field">
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="qa-modal-path-row">
              <button className="btn btn-ghost" onClick={pickFile}>Выбрать программу</button>
              {editing.path && <span className="qa-modal-path">{editing.path}</span>}
            </div>

            <div className="qa-modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={save} disabled={!editing.name.trim() || !hasKind}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function IconName({ name }: { name: string }) {
  const pic = name.match(/\.(png|ico|jpg|jpeg|svg)$/i)
  if (pic) return <img src={name} alt="" />
  return <span className="qa-ic-letter">{name[0]?.toUpperCase()}</span>
}

function nameFromPath(path: string): string {
  const base = path.split(/[\\/]/).pop() || path
  return base.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ')
}