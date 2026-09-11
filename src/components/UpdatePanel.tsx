import type { UpdateState } from '../types'
import './UpdatePanel.css'

interface Props {
  state: UpdateState
  onDismiss: () => void
}

function linkifyLine(line: string): React.ReactNode[] {
  const parts = line.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((p, i) => {
    if (/^https?:\/\//.test(p)) {
      return (
        <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a>
      )
    }
    return <span key={i}>{p}</span>
  })
}

function Notes({ text }: { text: string }) {
  const lines = (text || '').split('\n').filter(l => l.trim().length > 0)
  if (lines.length === 0) {
    return <p className="upd-text">Улучшения и исправления.</p>
  }
  return (
    <div className="upd-notes">
      {lines.map((l, i) => (
        <div key={i} className="upd-note-line">{linkifyLine(l)}</div>
      ))}
    </div>
  )
}

function Card({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="upd-card">
      <div className="upd-head">
        <div className="upd-icon">
          <svg className="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" />
            <path d="M12 6v6l3.5 2" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="upd-title">{title}</h3>
        {badge && <span className="upd-badge">{badge}</span>}
      </div>
      {children}
    </div>
  )
}

export default function UpdatePanel({ state, onDismiss }: Props) {
  switch (state.phase) {
    case 'checking':
      return (
        <Card title="Проверка обновлений…">
          <div className="upd-checking"><span className="upd-spinner" /></div>
        </Card>
      )

    case 'available':
      return (
        <Card title="Доступно обновление" badge={`v${state.version}`}>
          <Notes text={state.notes || ''} />
          <div className="upd-actions">
            <button className="btn btn-primary" onClick={() => window.quik?.updateDownload()}>Скачать обновление</button>
            <button className="btn btn-ghost" onClick={onDismiss}>Позже</button>
          </div>
        </Card>
      )

    case 'downloading':
      return (
        <Card title="Загрузка обновления" badge={`v${state.version}`}>
          <div className="upd-progress">
            <div className="upd-progress-bar" style={{ width: `${state.percent ?? 0}%` }} />
          </div>
          <div className="upd-percent">{state.percent ?? 0}%</div>
        </Card>
      )

    case 'downloaded':
      return (
        <Card title="Запускаем установщик" badge={`v${state.version}`}>
          <p className="upd-text">Файл скачан. Установщик запускается автоматически.</p>
          <div className="upd-checking"><span className="upd-spinner" /></div>
        </Card>
      )

    case 'not-available':
      return (
        <Card title="Обновлений нет">
          <p className="upd-text">У вас установлена последняя версия Quik.</p>
          <div className="upd-actions">
            <button className="btn btn-primary" onClick={onDismiss}>Ок</button>
          </div>
        </Card>
      )

    case 'error':
      return (
        <Card title="Ошибка проверки обновлений">
          <p className="upd-text">{state.message || 'Не удалось проверить обновления.'}</p>
          <div className="upd-actions">
            <button className="btn btn-primary" onClick={onDismiss}>Закрыть</button>
          </div>
        </Card>
      )

    case 'changelog':
      return (
        <Card title="Что нового" badge={`v${state.version}`}>
          <Notes text={state.notes || ''} />
          <div className="upd-actions">
            <button className="btn btn-primary" onClick={onDismiss}>Отлично</button>
          </div>
        </Card>
      )

    default:
      return null
  }
}