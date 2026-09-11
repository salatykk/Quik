import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { AppSettings, Theme, WidgetConfig, QuikAccount, QuickAccessApp, WeatherCity, CryptoCoin } from './types'

const STORAGE_KEY = 'quik-settings'

export function storageKey(): string {
  return STORAGE_KEY
}

const presetThemes: Theme[] = [
  {
    id: 'emerald',
    name: 'Изумруд',
    type: 'preset',
    colors: {
      background: 'rgba(7, 15, 13, 0.55)',
      text: '#e9fbf4',
      accent: '#34d399',
      border: 'rgba(255, 255, 255, 0.09)',
      glow: 'rgba(52, 211, 153, 0.16)'
    },
    font: 'Inter',
    borderRadius: 20
  },
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    type: 'preset',
    liquidGlass: true,
    colors: {
      background: 'rgba(255, 255, 255, 0.10)',
      text: '#ffffff',
      accent: '#7dd3fc',
      border: 'rgba(255, 255, 255, 0.24)',
      glow: 'rgba(125, 211, 252, 0.14)'
    },
    font: 'Inter',
    borderRadius: 24
  },
  {
    id: 'midnight',
    name: 'Полночь',
    type: 'preset',
    colors: {
      background: 'rgba(11, 10, 24, 0.6)',
      text: '#e9e6ff',
      accent: '#a78bfa',
      border: 'rgba(255, 255, 255, 0.08)',
      glow: 'rgba(167, 139, 250, 0.15)'
    },
    font: 'Inter',
    borderRadius: 18
  },
  {
    id: 'ember',
    name: 'Угли',
    type: 'preset',
    colors: {
      background: 'rgba(22, 12, 8, 0.6)',
      text: '#fff0e6',
      accent: '#fb923c',
      border: 'rgba(255, 255, 255, 0.08)',
      glow: 'rgba(251, 146, 60, 0.15)'
    },
    font: 'Inter',
    borderRadius: 18
  }
]

const defaultColors = presetThemes[0].colors

const defaultWidgets: WidgetConfig[] = [
  { id: 'clock', type: 'clock', enabled: true, position: { x: 0, y: 0 }, size: { width: 320, height: 122 }, opacity: 1 },
  { id: 'weather', type: 'weather', enabled: true, position: { x: 0, y: 0 }, size: { width: 320, height: 148 }, opacity: 1 },
  { id: 'crypto', type: 'crypto', enabled: true, position: { x: 0, y: 0 }, size: { width: 320, height: 258 }, opacity: 1 },
  { id: 'music', type: 'music', enabled: true, position: { x: 0, y: 0 }, size: { width: 320, height: 216 }, opacity: 1 },
  { id: 'maps', type: 'maps', enabled: false, position: { x: 0, y: 0 }, size: { width: 340, height: 330 }, opacity: 1 }
]

const defaultCryptoCoins: CryptoCoin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', enabled: true },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', enabled: true },
  { id: 'solana', symbol: 'SOL', name: 'Solana', enabled: true },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', enabled: false },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', enabled: false },
  { id: 'ripple', symbol: 'XRP', name: 'Ripple', enabled: false }
]

function getDefaultSettings(): AppSettings {
  return {
    account: null,
    theme: presetThemes[0],
    widgets: defaultWidgets,
    quickAccessApps: [],
    weatherCities: [],
    cryptoCoins: defaultCryptoCoins,
    isFirstLaunch: true,
    widgetScale: 1,
    animationSpeed: 1,
    reducedMotion: false
  }
}

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...getDefaultSettings(), ...parsed }
    }
  } catch {}
  return getDefaultSettings()
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {}
}

export type Action =
  | { type: 'SET_ACCOUNT'; payload: QuikAccount | null }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'UPDATE_THEME_COLORS'; payload: Partial<Theme['colors']> }
  | { type: 'SET_THEME_FONT'; payload: string }
  | { type: 'SET_THEME_BG'; payload: string | undefined }
  | { type: 'TOGGLE_LIQUID_GLASS' }
  | { type: 'SET_RADIUS'; payload: number }
  | { type: 'UPDATE_WIDGET'; payload: { id: string; changes: Partial<WidgetConfig> } }
  | { type: 'TOGGLE_WIDGET'; payload: string }
  | { type: 'SET_QUICK_ACCESS_APPS'; payload: QuickAccessApp[] }
  | { type: 'ADD_QUICK_ACCESS_APP'; payload: QuickAccessApp }
  | { type: 'REMOVE_QUICK_ACCESS_APP'; payload: string }
  | { type: 'SET_WEATHER_CITIES'; payload: WeatherCity[] }
  | { type: 'ADD_WEATHER_CITY'; payload: WeatherCity }
  | { type: 'REMOVE_WEATHER_CITY'; payload: number }
  | { type: 'SET_CRYPTO_COINS'; payload: CryptoCoin[] }
  | { type: 'TOGGLE_CRYPTO_COIN'; payload: string }
  | { type: 'SET_FIRST_LAUNCH_DONE' }
  | { type: 'SET_WIDGET_SCALE'; payload: number }
  | { type: 'SET_ANIMATION_SPEED'; payload: number }
  | { type: 'TOGGLE_REDUCED_MOTION' }
  | { type: 'LOAD_SETTINGS'; payload: AppSettings }

function reducer(state: AppSettings, action: Action): AppSettings {
  let next: AppSettings

  switch (action.type) {
    case 'SET_ACCOUNT':
      next = { ...state, account: action.payload }
      break
    case 'SET_THEME':
      next = { ...state, theme: action.payload }
      break
    case 'UPDATE_THEME_COLORS':
      next = { ...state, theme: { ...state.theme, colors: { ...state.theme.colors, ...action.payload } } }
      break
    case 'SET_THEME_FONT':
      next = { ...state, theme: { ...state.theme, font: action.payload } }
      break
    case 'SET_THEME_BG':
      next = { ...state, theme: { ...state.theme, backgroundImage: action.payload } }
      break
    case 'TOGGLE_LIQUID_GLASS':
      next = { ...state, theme: { ...state.theme, liquidGlass: !state.theme.liquidGlass } }
      break
    case 'SET_RADIUS':
      next = { ...state, theme: { ...state.theme, borderRadius: action.payload } }
      break
    case 'UPDATE_WIDGET':
      next = {
        ...state,
        widgets: state.widgets.map(w => (w.id === action.payload.id ? { ...w, ...action.payload.changes } : w))
      }
      break
    case 'TOGGLE_WIDGET':
      next = {
        ...state,
        widgets: state.widgets.map(w => (w.id === action.payload ? { ...w, enabled: !w.enabled } : w))
      }
      break
    case 'SET_QUICK_ACCESS_APPS':
      next = { ...state, quickAccessApps: action.payload }
      break
    case 'ADD_QUICK_ACCESS_APP':
      next = { ...state, quickAccessApps: [...state.quickAccessApps, action.payload] }
      break
    case 'REMOVE_QUICK_ACCESS_APP':
      next = { ...state, quickAccessApps: state.quickAccessApps.filter(a => a.id !== action.payload) }
      break
    case 'SET_WEATHER_CITIES':
      next = { ...state, weatherCities: action.payload }
      break
    case 'ADD_WEATHER_CITY':
      next = { ...state, weatherCities: [...state.weatherCities, action.payload] }
      break
    case 'REMOVE_WEATHER_CITY':
      next = { ...state, weatherCities: state.weatherCities.filter((_, i) => i !== action.payload) }
      break
    case 'SET_CRYPTO_COINS':
      next = { ...state, cryptoCoins: action.payload }
      break
    case 'TOGGLE_CRYPTO_COIN':
      next = {
        ...state,
        cryptoCoins: state.cryptoCoins.map(c => (c.id === action.payload ? { ...c, enabled: !c.enabled } : c))
      }
      break
    case 'SET_FIRST_LAUNCH_DONE':
      next = { ...state, isFirstLaunch: false }
      break
    case 'SET_WIDGET_SCALE':
      next = { ...state, widgetScale: action.payload }
      break
    case 'SET_ANIMATION_SPEED':
      next = { ...state, animationSpeed: action.payload }
      break
    case 'TOGGLE_REDUCED_MOTION':
      next = { ...state, reducedMotion: !state.reducedMotion }
      break
    case 'LOAD_SETTINGS':
      next = action.payload
      break
    default:
      return state
  }

  saveSettings(next)
  return next
}

interface StoreContextValue {
  settings: AppSettings
  dispatch: React.Dispatch<Action>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, dispatch] = useReducer(reducer, undefined, loadSettings)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        dispatch({ type: 'LOAD_SETTINGS', payload: loadSettings() })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return <StoreContext.Provider value={{ settings, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export { presetThemes, defaultColors }