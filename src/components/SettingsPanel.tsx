import { useState, useEffect } from 'react'
import { useStore, presetThemes } from '../store'
import { CustomWidgetSpec, CustomModuleId } from '../types'
import BackgroundPicker from './BackgroundPicker'
import './SettingsPanel.css'

interface Props {
  onClose: () => void
}

type Tab = 'look' | 'bg' | 'widgets' | 'custom' | 'cities' | 'general' | 'about'

const WIDGET_NAME: Record<string, string> = {
  clock: 'Часы',
  weather: 'Погода',
  crypto: 'Криптовалюты',
  music: 'Музыка',
  maps: 'Карты'
}

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'look', label: 'Внешний вид', icon: <PaletteIcon /> },
  { id: 'bg', label: 'Фоны', icon: <ImageIcon /> },
  { id: 'widgets', label: 'Виджеты', icon: <GridIcon /> },
  { id: 'custom', label: 'Свои виджеты', icon: <WandIcon /> },
  { id: 'cities', label: 'Города', icon: <PinIcon /> },
  { id: 'general', label: 'Общие', icon: <GearIcon /> },
  { id: 'about', label: 'О Quik', icon: <InfoIcon /> }
]

const MODULE_OPTIONS: { id: CustomModuleId; label: string }[] = [
  { id: 'clock', label: 'Часы' },
  { id: 'weather', label: 'Погода' },
  { id: 'crypto', label: 'Крипта' },
  { id: 'music', label: 'Музыка' },
  { id: 'maps', label: 'Карты' }
]

const SIZE_PRESETS: { id: string; label: string; size: { width: number; height: number } }[] = [
  { id: 'small', label: 'Малый', size: { width: 240, height: 180 } },
  { id: 'medium', label: 'Средний', size: { width: 320, height: 260 } },
  { id: 'large', label: 'Большой', size: { width: 400, height: 340 } },
  { id: 'custom', label: 'Свой', size: { width: 0, height: 0 } }
]

export default function SettingsPanel({ onClose }: Props) {
  const { settings, dispatch } = useStore()
  const [tab, setTab] = useState<Tab>('look')

  return (
    <div className="set panel">
      <div className="set-head">
        <span className="set-title">Настройки</span>
        <button className="icon-btn" onClick={onClose}>
          <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="set-layout">
        <nav className="set-nav">
          {NAV.map(n => (
            <button key={n.id} className={`set-nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
              <span className="set-nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="set-content">
          {tab === 'look' && <LookTab />}
          {tab === 'bg' && <BgTab />}
          {tab === 'widgets' && <WidgetsTab />}
          {tab === 'custom' && <CustomTab />}
          {tab === 'cities' && <CitiesTab />}
          {tab === 'general' && <GeneralTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  )
}

function LookTab() {
  const { settings, dispatch } = useStore()
  const t = settings.theme

  return (
    <div className="tab-scroll">
      <h3 className="sec-title">Тема</h3>
      <div className="theme-grid">
        {presetThemes.map(p => (
          <button key={p.id} className={`theme-card ${t.id === p.id ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_THEME', payload: p })}>
            <div className="theme-preview" style={{ background: p.colors.background, color: p.colors.text }}>
              <span className="theme-preview-dot" style={{ background: p.colors.accent }} />
              <span className="theme-preview-aa" style={{ fontFamily: p.font }}>Aa</span>
            </div>
            <span className="theme-card-name">{p.name}</span>
            {p.liquidGlass && <span className="theme-mark">Liquid</span>}
            {t.id === p.id && (
              <span className="theme-check">
                <svg className="ic" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3.4">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>

      <h3 className="sec-title">Цвета</h3>
      <div className="color-grid">
        <ColorField label="Акцент" value={t.colors.accent} onChange={v => dispatch({ type: 'UPDATE_THEME_COLORS', payload: { accent: v } })} />
        <ColorField label="Текст" value={t.colors.text} onChange={v => dispatch({ type: 'UPDATE_THEME_COLORS', payload: { text: v } })} />
        <ColorField label="Фон" value={rgbaToHex(t.colors.background)} onChange={v => dispatch({ type: 'UPDATE_THEME_COLORS', payload: { background: hexToRgba(v, 0.78) } })} />
      </div>

      <h3 className="sec-title">Отделка</h3>
      <SettingRow label="Liquid Glass" hint="Стеклянное оформление">
        <div className={`switch ${t.liquidGlass ? 'on' : ''}`} onClick={() => dispatch({ type: 'TOGGLE_LIQUID_GLASS' })} />
      </SettingRow>
      <SettingRow label="Скругление" hint={`${t.borderRadius}px`}>
        <input className="slider" type="range" min={6} max={40} value={t.borderRadius} onChange={e => dispatch({ type: 'SET_RADIUS', payload: Number(e.target.value) })} />
      </SettingRow>
      <SettingRow label="Шрифт" hint="Основной">
        <div className="font-options">
          {['Inter', 'Space Grotesk'].map(f => (
            <button key={f} className={`font-option ${t.font === f ? 'active' : ''}`} style={{ fontFamily: f }} onClick={() => dispatch({ type: 'SET_THEME_FONT', payload: f })}>
              {f === 'Inter' ? 'Inter' : 'Space'}
            </button>
          ))}
        </div>
      </SettingRow>
    </div>
  )
}

function BgTab() {
  const { settings, dispatch } = useStore()

  const setWallpaper = (bg: any) => dispatch({ type: 'SET_WALLPAPER', payload: bg })

  const setWidgetBg = (id: string, bg: any) =>
    dispatch({ type: 'UPDATE_WIDGET', payload: { id, changes: { background: bg.type === 'none' ? undefined : bg } } })

  const isN = (v: any) => !v || v.type === 'none'

  return (
    <div className="tab-scroll">
      <h3 className="sec-title">Обои рабочего стола</h3>
      <p className="sec-sub">Анимированный фон позади всех виджетов. Поддерживаются видео и GIF.</p>
      <div className="bg-card">
        <BackgroundPicker value={settings.wallpaper} onChange={setWallpaper} />
      </div>

      <h3 className="sec-title">Фон каждого виджета</h3>
      <p className="sec-sub">Свой фон для отдельного виджета (видео, картинка или цвет).</p>
      <div className="wbg-list">
        {settings.widgets.map(w => (
          <div key={w.id} className="wbg-item">
            <div className="wbg-item-head">
              <span className="wbg-item-name">{w.type === 'custom' && w.custom ? w.custom.title : WIDGET_NAME[w.type] || w.type}</span>
              {!isN(w.background) && <span className="wbg-item-badge">есть фон</span>}
            </div>
            <BackgroundPicker value={w.background} onChange={bg => setWidgetBg(w.id, bg)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomTab() {
  const { settings, dispatch } = useStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomWidgetSpec>({ title: '', text: '', modules: ['clock'], size: { width: 320, height: 260 } })

  const customWidgets = settings.widgets.filter((w): w is typeof w & { custom: CustomWidgetSpec } => w.type === 'custom' && !!w.custom)

  const startNew = () => {
    setEditingId('__new__')
    setForm({ title: '', text: '', modules: ['clock'], size: { width: 320, height: 260 } })
  }

  const startEdit = (w: any) => {
    setEditingId(w.id)
    setForm({ title: w.custom.title, text: w.custom.text, modules: [...w.custom.modules], size: { ...w.custom.size } })
  }

  const save = () => {
    if (!form.title.trim()) return
    const clean: CustomWidgetSpec = {
      title: form.title.trim(),
      text: form.text.trim(),
      modules: form.modules.length ? form.modules : ['clock'],
      size: { width: Math.max(200, form.size.width || 320), height: Math.max(140, form.size.height || 260) }
    }
    if (editingId === '__new__') {
      dispatch({ type: 'ADD_CUSTOM_WIDGET', payload: clean })
    } else if (editingId) {
      dispatch({ type: 'UPDATE_CUSTOM_WIDGET', payload: { id: editingId, changes: clean } })
    }
    setEditingId(null)
  }

  const remove = (id: string) => {
    if (confirm('Удалить этот виджет?')) {
      dispatch({ type: 'REMOVE_CUSTOM_WIDGET', payload: id })
      if (editingId === id) setEditingId(null)
    }
  }

  const toggleModule = (m: CustomModuleId) => {
    setForm(f => ({ ...f, modules: f.modules.includes(m) ? f.modules.filter(x => x !== m) : [...f.modules, m] }))
  }

  const presetSize = (id: string) => {
    const p = SIZE_PRESETS.find(x => x.id === id)
    if (!p) return
    if (p.id === 'custom') return
    setForm(f => ({ ...f, size: p.size }))
  }

  const isPreset = (size: { width: number; height: number }) =>
    SIZE_PRESETS.find(p => p.id !== 'custom' && p.size.width === size.width && p.size.height === size.height)?.id

  return (
    <div className="tab-scroll">
      <h3 className="sec-title">Ваши виджеты</h3>
      <p className="sec-sub">Соберите виджет из модулей Quik: часы, погода, крипта, музыка, карты — и добавьте свой текст.</p>

      {customWidgets.length === 0 && !editingId && (
        <div className="cw-empty">
          <span className="cw-empty-ic">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="6" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </span>
          <span>Пока нет своих виджетов</span>
        </div>
      )}

      <div className="cw-list">
        {customWidgets.map(w => (
          <div key={w.id} className="cw-row">
            <span className="cw-row-title" title={w.custom.title}>{w.custom.title || 'Без названия'}</span>
            <span className="cw-row-size">{w.custom.size.width}×{w.custom.size.height}</span>
            <div className={`switch ${w.enabled ? 'on' : ''}`} onClick={() => dispatch({ type: 'TOGGLE_WIDGET', payload: w.id })} />
            <button className="icon-btn" onClick={() => startEdit(w)} title="Редактировать">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
            <button className="icon-btn" onClick={() => remove(w.id)} title="Удалить">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {editingId ? (
        <div className="cw-editor">
          <h3 className="sec-title">{editingId === '__new__' ? 'Новый виджет' : 'Редактирование'}</h3>

          <div className="field">
            <span className="cw-label">Название</span>
            <input className="cw-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Мой виджет" />
          </div>

          <div className="field">
            <span className="cw-label">Размер</span>
            <div className="bg-fit-row cw-size-row">
              {SIZE_PRESETS.map(p => (
                <button
                  key={p.id}
                  className={`bg-fit ${p.id === 'custom' ? (isPreset(form.size) ? '' : 'active') : isPreset(form.size) === p.id ? 'active' : ''}`}
                  onClick={() => presetSize(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="cw-size-fields">
              <input className="cw-input" type="number" min={200} value={form.size.width} onChange={e => setForm(f => ({ ...f, size: { width: Number(e.target.value) || 320, height: f.size.height } }))} />
              <span className="cw-size-x">×</span>
              <input className="cw-input" type="number" min={140} value={form.size.height} onChange={e => setForm(f => ({ ...f, size: { width: f.size.width, height: Number(e.target.value) || 260 } }))} />
            </div>
          </div>

          <div className="field">
            <span className="cw-label">Текст</span>
            <textarea
              className="cw-textarea"
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              placeholder="Можно написать что угодно — заметка, цитата, список дел…"
              rows={3}
            />
          </div>

          <div className="field">
            <span className="cw-label">Модули внутри виджета</span>
            <div className="cw-mods">
              {MODULE_OPTIONS.map(m => (
                <button key={m.id} className={`cw-mod ${form.modules.includes(m.id) ? 'active' : ''}`} onClick={() => toggleModule(m.id)}>
                  {form.modules.includes(m.id) && (
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cw-editor-actions">
            <button className="btn btn-ghost" onClick={() => setEditingId(null)}>Отмена</button>
            <button className="btn btn-primary" onClick={save}>Сохранить</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary cw-create" onClick={startNew}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Создать свой виджет
        </button>
      )}
    </div>
  )
}

function WidgetsTab() {
  const { settings, dispatch } = useStore()

  return (
    <div className="tab-scroll">
      <h3 className="sec-title">Виджеты на столе</h3>
      <div className="wlist">
        {settings.widgets.map(w => (
          <SettingRow key={w.id} label={w.type === 'custom' && w.custom ? w.custom.title : WIDGET_NAME[w.type] || w.type} hint="Показано на рабочем столе">
            <div className={`switch ${w.enabled ? 'on' : ''}`} onClick={() => dispatch({ type: 'TOGGLE_WIDGET', payload: w.id })} />
          </SettingRow>
        ))}
      </div>

      <h3 className="sec-title">Криптовалюты</h3>
      <div className="coins">
        {settings.cryptoCoins.map(c => (
          <button key={c.id} className={`coin ${c.enabled ? 'active' : ''}`} onClick={() => dispatch({ type: 'TOGGLE_CRYPTO_COIN', payload: c.id })}>
            <span className="coin-glyph" style={{ color: COIN_COLORS[c.id], background: `${COIN_COLORS[c.id]}1f` }}>{c.symbol[0]}</span>
            <span className="coin-sym">{c.symbol}</span>
            {c.enabled && <CheckIcon />}
          </button>
        ))}
      </div>
    </div>
  )
}

function CitiesTab() {
  const { settings, dispatch } = useStore()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ name: string; lat: number; lon: number }[]>([])
  const [busy, setBusy] = useState(false)

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`)
      const d: any[] = await r.json()
      setResults(d.map(p => ({ name: p.display_name.split(',')[0], lat: parseFloat(p.lat), lon: parseFloat(p.lon) })))
    } catch {
      setResults([])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tab-scroll">
      <h3 className="sec-title">Дополнительные города погоды</h3>
      <p className="sec-sub">Главный город определяется автоматически по IP. Добавляйте свои.</p>

      <form className="field city-search" onSubmit={search}>
        <svg className="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Найти город…" />
        <button className="btn btn-primary" type="submit" disabled={busy || !q.trim()}>Найти</button>
      </form>

      {results.length > 0 && (
        <div className="search-results anim-fade-up">
          {results.map((r, i) => (
            <button key={i} className="search-result" onClick={() => dispatch({ type: 'ADD_WEATHER_CITY', payload: { name: r.name, country: '', lat: r.lat, lon: r.lon } })}>
              <span>{r.name}</span>
              <span className="search-add">Добавить</span>
            </button>
          ))}
        </div>
      )}

      <div className="city-list">
        {settings.weatherCities.length === 0 && <p className="empty-hint">Пока нет дополнительных городов</p>}
        {settings.weatherCities.map((c, i) => (
          <div key={i} className="city-row">
            <span className="city-pin">
              <svg className="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span className="city-name">{c.name}</span>
            <button className="icon-btn city-del" onClick={() => {
              const list = [...settings.weatherCities]
              list.splice(i, 1)
              dispatch({ type: 'SET_WEATHER_CITIES', payload: list })
            }}>
              <svg className="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneralTab() {
  const { settings, dispatch } = useStore()
  const [autostart, setAutostart] = useState(false)

  useEffect(() => {
    window.quik?.getAutostart().then(setAutostart)
  }, [])

  const toggleAutostart = async () => {
    const next = !autostart
    setAutostart(next)
    await window.quik?.setAutostart(next)
  }

  const reset = () => {
    if (confirm('Сбросить все настройки Quik? Виджеты вернутся к стандартным.')) {
      localStorage.removeItem('quik-settings')
      location.reload()
    }
  }

  return (
    <div className="tab-scroll">
      <h3 className="sec-title">Масштаб и плавность</h3>
      <SettingRow label="Масштаб виджетов" hint={`${Math.round(settings.widgetScale * 100)}%`}>
        <input className="slider" type="range" min={60} max={200} value={settings.widgetScale * 100} onChange={e => dispatch({ type: 'SET_WIDGET_SCALE', payload: Number(e.target.value) / 100 })} />
      </SettingRow>
      <SettingRow label="Скорость анимаций" hint={`${settings.animationSpeed}x`}>
        <input className="slider" type="range" min={50} max={200} value={settings.animationSpeed * 100} onChange={e => dispatch({ type: 'SET_ANIMATION_SPEED', payload: Number(e.target.value) / 100 })} />
      </SettingRow>
      <SettingRow label="Уменьшить анимации" hint="Для слабой системы">
        <div className={`switch ${settings.reducedMotion ? 'on' : ''}`} onClick={() => dispatch({ type: 'TOGGLE_REDUCED_MOTION' })} />
      </SettingRow>

      <h3 className="sec-title">Система</h3>
      <SettingRow label="Запуск с Windows" hint="Quik в автозагрузке">
        <div className={`switch ${autostart ? 'on' : ''}`} onClick={toggleAutostart} />
      </SettingRow>

      <button className="btn btn-danger reset-btn" onClick={reset}>Сбросить настройки</button>
    </div>
  )
}

function AboutTab() {
  const { settings } = useStore()
  const name = settings.account?.nickname || '—'
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.quik?.getAppVersion().then(setVersion)
  }, [])

  return (
    <div className="tab-scroll about">
      <div className="about-mark">Q</div>
      <h2 className="about-name">Quik</h2>
      <p className="about-sub">Виджеты и оверлей для компьютера</p>

      <div className="about-facts">
        <div className="about-fact"><span>User</span><b>{name}</b></div>
        <div className="about-fact"><span>Версия</span><b>{version}</b></div>
        <div className="about-fact"><span>Виджеты</span><b>{settings.widgets.filter(w => w.enabled).length} из {settings.widgets.length}</b></div>
        <div className="about-fact"><span>Горячие клавиши</span><b>Ctrl+Shift+Tab</b></div>
      </div>

      <button className="btn btn-primary about-update-btn" onClick={() => window.quik?.updateCheck()}>
        <svg className="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" />
          <path d="M12 6v6l3.5 2" strokeLinecap="round" />
        </svg>
        Проверить обновления
      </button>
    </div>
  )
}

/* ---------- little helpers ---------- */

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-label">
        <span>{label}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function rgbaToHex(rgba: string): string {
  const m = rgba.match(/[\d.]+/g)
  if (!m || m.length < 3) return '#000000'
  const to = (n: string) => Math.round(parseFloat(n)).toString(16).padStart(2, '0')
  return `#${to(m[0])}${to(m[1])}${to(m[2])}`
}

function hexToRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

const COIN_COLORS: Record<string, string> = {
  bitcoin: '#f7931a',
  ethereum: '#8a9bff',
  solana: '#14f195',
  dogecoin: '#e3c14e',
  cardano: '#9ab8ff',
  ripple: '#5fd4ff'
}

function CheckIcon() {
  return (
    <svg className="ic coin-state" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

/* ---------- icons ---------- */
function PaletteIcon() {
  return <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22a10 10 0 1 1 10-10c0 2.5-2 4-4 4h-1.5c-1.5 0-2.5 1-2.5 2.5 0 .6.2 1.2.6 1.7.5.7.4 1.8-.6 1.8z" /><circle cx="7.5" cy="11.5" r="1" /><circle cx="11" cy="7.5" r="1" /><circle cx="16" cy="9" r="1" /></svg>
}
function GridIcon() {
  return <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>
}
function PinIcon() {
  return <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
}
function GearIcon() {
  return <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
}
function InfoIcon() {
  return <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
}
function ImageIcon() {
  return <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="9" r="1.6" /><path d="M21 15l-5-5L5 21" /></svg>
}
function WandIcon() {
  return <svg className="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 4V2M15 22v-2M8 9L2 5l10 2 10-2-6 4M2 12l3 3M22 12l-3 3M8 19h14M4 8v4" /><path d="M5 12l4-4M15 12l4-4" strokeLinecap="round" /></svg>
}