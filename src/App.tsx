import { useEffect } from 'react'
import { StoreProvider, useStore } from './store'
import { useHashRoute } from './hooks/useHashRoute'
import WidgetWindow from './views/WidgetView'
import OverlayView from './views/OverlayView'

function AppContent() {
  const route = useHashRoute()
  const { settings } = useStore()

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', settings.reducedMotion)
  }, [settings.reducedMotion])

  if (route.view === 'overlay') {
    return <OverlayView />
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