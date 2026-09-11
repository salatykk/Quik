import { WidgetBackground } from '../types'

export function fileUrl(p: string): string {
  if (!p) return ''
  const clean = p.replace(/\\/g, '/')
  const [head, ...rest] = clean.split('/')
  return `file:///${head}/${rest.map(s => encodeURIComponent(s)).join('/')}`
}

export function isVideoPath(p: string): boolean {
  return /\.(mp4|webm|mkv|mov|m4v|avi)$/i.test(p)
}

interface Props {
  bg?: WidgetBackground
  className?: string
}

export default function BackgroundLayer({ bg, className }: Props) {
  if (!bg || bg.type === 'none') return null
  const src = bg.value ? fileUrl(bg.value) : ''

  if (bg.type === 'color') {
    return <div className={`bg-layer bg-color ${className || ''}`} style={{ background: bg.value, opacity: bg.opacity ?? 1 }} />
  }

  if (bg.type === 'video' || (bg.type === 'image' && bg.value && isVideoPath(bg.value))) {
    return (
      <video
        className={`bg-layer bg-media ${className || ''}`}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        style={{ objectFit: bg.fit || 'cover', opacity: bg.opacity ?? 1 }}
      />
    )
  }

  return <img className={`bg-layer bg-media ${className || ''}`} src={src} alt="" style={{ objectFit: bg.fit || 'cover', opacity: bg.opacity ?? 1 }} />
}