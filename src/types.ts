export type WidgetType = 'clock' | 'weather' | 'crypto' | 'maps' | 'music'

export interface WidgetColors {
  background: string
  text: string
  accent: string
  border: string
  glow: string
}

export interface WidgetConfig {
  id: string
  type: WidgetType
  enabled: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  colors?: Partial<WidgetColors>
  font?: string
  opacity: number
}

export interface Theme {
  id: string
  name: string
  type: 'preset' | 'custom'
  colors: WidgetColors
  font: string
  backgroundImage?: string
  liquidGlass?: boolean
  borderRadius: number
}

export interface QuikAccount {
  id: string
  nickname: string
  avatar: string | null
  createdAt: number
}

export interface QuickAccessApp {
  id: string
  name: string
  path?: string
  url?: string
}

export interface WeatherCity {
  name: string
  country: string
  lat: number
  lon: number
}

export interface CryptoCoin {
  id: string
  symbol: string
  name: string
  enabled: boolean
}

export type PlaybackStatus = 'playing' | 'paused' | 'stopped' | 'none'

export interface MediaSnapshot {
  title: string
  artist: string
  status: PlaybackStatus
  pos: number
  dur: number
  app: string
}

export interface AppSettings {
  account: QuikAccount | null
  theme: Theme
  widgets: WidgetConfig[]
  quickAccessApps: QuickAccessApp[]
  weatherCities: WeatherCity[]
  cryptoCoins: CryptoCoin[]
  isFirstLaunch: boolean
  widgetScale: number
  animationSpeed: number
  reducedMotion: boolean
}

declare global {
  interface Window {
    quik: {
      openOverlay: (panel?: 'settings' | 'account') => void
      closeOverlay: () => void
      onOverlayPanel: (cb: (panel: 'settings' | 'account') => void) => void
      getStartPanel: () => Promise<'settings' | 'account' | null>
      widgetDragStart: (id: string, sx: number, sy: number) => void
      widgetDragMove: (id: string, sx: number, sy: number) => void
      widgetDragEnd: (id: string) => void
      widgetResizeStart: (id: string, sx: number, sy: number) => void
      widgetResize: (id: string, sx: number, sy: number) => void
      widgetResizeEnd: (id: string) => void
      widgetSetVisible: (id: string, visible: boolean) => void
      widgetSetScale: (id: string, scale: number) => void
      widgetCustomized: (id: string) => Promise<boolean>
      getMedia: () => Promise<MediaSnapshot | null>
      onMediaUpdate: (cb: (snap: MediaSnapshot | null) => void) => () => void
      openApp: (path: string) => Promise<boolean>
      pickFile: () => Promise<string | null>
      getAutostart: () => Promise<boolean>
      setAutostart: (enabled: boolean) => Promise<boolean>
      embedApp: (
        id: string,
        appPath: string
      ) => Promise<{ ok: boolean; reattached?: boolean; reason?: string }>
      layoutApp: (
        id: string,
        rect: { x: number; y: number; width: number; height: number },
        dpr: number
      ) => void
      releaseApp: (id: string) => void
      embedStatus: () => Promise<Record<string, { pid: number; attached: boolean }>>
      getAppVersion: () => Promise<string>
    }
  }
}