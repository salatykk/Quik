import { useState, useRef } from 'react'
import { useStore } from '../store'
import './AccountPanel.css'

interface Props {
  onClose: () => void
}

export default function AccountPanel({ onClose }: Props) {
  const { settings, dispatch } = useStore()
  const [nickname, setNickname] = useState(settings.account?.nickname || '')
  const [avatar, setAvatar] = useState<string | null>(settings.account?.avatar || null)
  const fileRef = useRef<HTMLInputElement>(null)

  const create = () => {
    if (!nickname.trim()) return
    dispatch({
      type: 'SET_ACCOUNT',
      payload: { id: Date.now().toString(), nickname: nickname.trim(), avatar, createdAt: Date.now() }
    })
    onClose()
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setAvatar(reader.result as string)
    reader.readAsDataURL(f)
  }

  return (
    <div className="acc panel">
      <div className="acc-head">
        <span className="acc-title">
          {settings.account ? 'Мой профиль' : 'Quik ID'}
        </span>
        <button className="icon-btn" onClick={onClose}>
          <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {settings.account ? (
        <div className="acc-body">
          <div className="acc-photo">
            {settings.account.avatar ? (
              <img src={settings.account.avatar} alt="" />
            ) : (
              <span className="acc-photo-initials">{settings.account.nickname[0].toUpperCase()}</span>
            )}
          </div>
          <div className="acc-name">{settings.account.nickname}</div>
          <div className="acc-meta">ID {settings.account.id.slice(-6)}</div>
          <div className="acc-meta-soft">
            Создан {new Date(settings.account.createdAt).toLocaleDateString('ru-RU')}
          </div>
          <div className="acc-ready">
            <svg className="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Входить больше не нужно
          </div>
          <button
            className="btn btn-danger acc-logout"
            onClick={() => { dispatch({ type: 'SET_ACCOUNT', payload: null }); onClose() }}
          >
            Выйти из Quik ID
          </button>
        </div>
      ) : (
        <div className="acc-body">
          <button className="acc-photo acc-photo-pick" onClick={() => fileRef.current?.click()}>
            {avatar ? (
              <img src={avatar} alt="" />
            ) : (
              <span className="acc-photo-empty">
                <svg className="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                <span>Фото</span>
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} hidden />

          <div className="field acc-field">
            <svg className="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input
              placeholder="Никнейм"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
            />
          </div>

          <button className="btn btn-primary acc-submit" onClick={create} disabled={!nickname.trim()}>
            Создать Quik ID
          </button>
          <p className="acc-note">Аккаунт хранится локально на этом компьютере.</p>
        </div>
      )}
    </div>
  )
}