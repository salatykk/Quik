import { useEffect, useMemo } from 'react'
import { StoreProvider, useStore } from './store'
import { useHashRoute } from './hooks/useHashRoute'
import WidgetWindow from './views/WidgetView'
import OverlayView from './views/OverlayView'
import WallpaperView from './views/WallpaperView'

function AppContent() {
  const route = useHashRoute()
  const { settings } = useStore()

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', settings.reducedMotion)
  }, [settings.reducedMotion])

  useEffect(() => {
    window.quik?.setWallpaper(settings.wallpaper)
  }, [settings.wallpaper])

  const customWidgetSpecs = useMemo(() => {
    return settings.widgets
      .filter(w => w.type === 'custom' && w.custom)
      .map(w => ({ id: w.id, width: w.custom!.size.width, height: w.custom!.size.height, title: w.custom!.title }))
  }, [settings.widgets])

  useEffect(() => {
    window.quik?.syncCustomWidgets(customWidgetSpecs)
  }, [customWidgetSpecs])

  if (route.view === 'overlay') {
    return <OverlayView />
  }

  if (route.view === 'wallpaper') {
    return <WallpaperView />
  }

  return <WidgetWindow type={route.widgetType || 'clock'} />
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  )
}