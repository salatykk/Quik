import { useStore } from '../store'
import BackgroundLayer from '../components/BackgroundLayer'
import './WallpaperView.css'

export default function WallpaperView() {
  const { settings } = useStore()
  const { wallpaper } = settings

  return (
    <div className="wp-view">
      <BackgroundLayer bg={wallpaper.type === 'none' ? undefined : wallpaper} />
      {wallpaper.type !== 'none' && <div className="wp-dim" />}
    </div>
  )
}