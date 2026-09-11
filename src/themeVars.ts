import { Theme, WidgetConfig } from './types'
import { defaultColors } from './store'

export function themeVars(theme: Theme, config?: WidgetConfig, blurAmount = 18): React.CSSProperties {
  const colors = { ...defaultColors, ...theme.colors }
  const wc = config?.colors || {}
  const accent = wc.accent || colors.accent
  const text = wc.text || colors.text
  const bg = wc.background || colors.background

  const liquid = !!theme.liquidGlass

  const cardBg = liquid
    ? 'linear-gradient(155deg, rgba(255,255,255,0.26), rgba(255,255,255,0.10))'
    : `linear-gradient(155deg, ${withAlpha(bg, 0.96)}, ${withAlpha(bg, 0.82)})`

  const panelBg = liquid
    ? 'linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))'
    : `linear-gradient(155deg, ${withAlpha(bg, 0.96)}, ${withAlpha(bg, 0.86)})`

  const border = liquid ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.085)'
  const accentBorder = liquid ? 'rgba(255,255,255,0.4)' : withAlpha(accent, 0.4)
  const accentSoft = liquid ? 'rgba(255,255,255,0.12)' : withAlpha(accent, 0.15)

  return {
    '--accent': accent,
    '--accent-strong': accent,
    '--accent-soft': accentSoft,
    '--accent-border': accentBorder,
    '--accent-glow': liquid ? 'rgba(255,255,255,0.4)' : withAlpha(accent, 0.4),
    '--text': text,
    '--text-2': withAlpha(text, 0.62),
    '--text-3': withAlpha(text, 0.34),
    '--muted': withAlpha(text, 0.66),
    '--faint': withAlpha(text, 0.4),
    '--card-bg': cardBg,
    '--panel-bg': panelBg,
    '--line': border,
    '--line-strong': liquid ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.13)',
    '--blur': `blur(${blurAmount}px) saturate(140%)`,
    '--radius': `${theme.borderRadius}px`,
    '--font': 'Inter, Segoe UI, system-ui, sans-serif',
    '--font-display': "Space Grotesk, Inter, Segoe UI, sans-serif",
    '--widget-font':  config?.font || 'Inter, Segoe UI, system-ui, sans-serif'
  } as React.CSSProperties
}

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    return hexToRgba(color, alpha)
  }
  const m = color.match(/[\d.]+/g)
  if (m && m.length >= 3) {
    const r = Math.round(parseFloat(m[0]))
    const g = Math.round(parseFloat(m[1]))
    const b = Math.round(parseFloat(m[2]))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return `rgba(0, 0, 0, ${alpha})`
}

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}