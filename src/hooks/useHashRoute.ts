import { useState, useEffect } from 'react'

export interface Route {
  view: 'overlay' | 'widget' | 'wallpaper'
  widgetType?: string
}

function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash.startsWith('overlay')) {
    return { view: 'overlay' }
  }
  if (hash.startsWith('wallpaper')) {
    return { view: 'wallpaper' }
  }
  if (hash.startsWith('widget/')) {
    const type = hash.split('/')[1]
    return { view: 'widget', widgetType: type }
  }
  return { view: 'widget', widgetType: 'clock' }
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parseRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return route
}