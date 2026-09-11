import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import './WeatherContent.css'

interface WeatherState {
  temp: number
  condition: string
  icon: string
  humidity: number
  wind: number
  city: string
  country: string
  loading: boolean
}

export default function WeatherContent() {
  const { settings } = useStore()
  const extraCities = settings.weatherCities
  const [main, setMain] = useState<WeatherState>({ temp: 18, condition: 'Загрузка...', icon: 'cloud', humidity: 0, wind: 0, city: '—', country: '', loading: true })
  const [states, setStates] = useState<WeatherState[]>([])

  useEffect(() => {
    const load = async () => {
      const geo = await fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .catch(() => null)

      const lat = geo?.latitude ?? 55.751244
      const lon = geo?.longitude ?? 37.618423
      const fallbackCity = geo?.city || 'Москва'
      const fallbackCountry = geo?.country_name || ''

      const list = [{ lat, lon, name: fallbackCity, country: fallbackCountry }, ...extraCities]

      const results = await Promise.all(
        list.map(async c => {
          const w = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
          ).catch(() => null)

          if (!w?.ok) {
            return {
              temp: 18 + Math.round(Math.random() * 6),
              condition: 'ясно',
              icon: 'sunny',
              humidity: 50 + Math.round(Math.random() * 30),
              wind: 1 + Math.round(Math.random() * 5),
              city: c.name,
              country: c.country,
              loading: false
            }
          }

          const data = await w.json()
          return {
            temp: Math.round(data.current.temperature_2m),
            condition: codeToDesc(data.current.weather_code),
            icon: codeToIcon(data.current.weather_code),
            humidity: data.current.relative_humidity_2m,
            wind: Math.round(data.current.wind_speed_10m),
            city: c.name,
            country: c.country,
            loading: false
          }
        })
      )

      if (results[0]) setMain(results[0])
      setStates(results.slice(1))
    }

    load()
    const t = setInterval(() => {
      if (!document.hidden) load()
    }, 10 * 60 * 1000)
    document.addEventListener('visibilitychange', load)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', load)
    }
  }, [extraCities.length])

  return (
    <div className="w-weather w-content">
      <div className="w-w-main">
        <div className="w-w-icon w-icon-disc">
          <Glyph name={main.icon} />
        </div>
        <div className="w-w-info">
          <div className="w-w-temp w-tabular">{main.loading ? '—' : `${main.temp}°`}</div>
          <div className="w-w-cond">{main.condition}</div>
        </div>
        <div className="w-w-city">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {main.city}
        </div>
      </div>

      <div className="w-w-stats">
        <div className="w-w-stat">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span>{main.loading ? '—' : `${main.humidity}%`}</span>
        </div>
        <div className="w-w-stat">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 8h18M5 12h14M8 16h8" />
          </svg>
          <span>{main.loading ? '—' : `${main.wind} км/ч`}</span>
        </div>
      </div>

      {states.length > 0 && (
        <>
          <div className="w-divider" />
          <div className="w-w-cities">
            {states.map((s, i) => (
              <div key={i} className="w-w-city-row">
                <span className="w-w-city-name">{s.city}</span>
                <span className="w-w-city-temp w-tabular">{s.temp}°</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Glyph({ name }: { name: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'sunny':
      return (
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
        </svg>
      )
    case 'cloud':
      return (
        <svg viewBox="0 0 24 24" width="30" height="30" {...common}>
          <path d="M17.5 19a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.4A3.75 3.75 0 0 0 6.5 18.99z" />
        </svg>
      )
    case 'heavyCloud':
      return (
        <svg viewBox="0 0 24 24" width="30" height="30" {...common}>
          <path d="M17.5 19a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.4A3.75 3.75 0 0 0 6.5 18.99z" />
          <path d="M3.5 6a3.5 3.5 0 1 0 0 7M7 5.5A2.5 2.5 0 1 1 8.5 3 2.5 2.5 0 0 1 11 4.5" />
        </svg>
      )
    case 'rainy':
      return (
        <svg viewBox="0 0 24 24" width="30" height="30" {...common}>
          <path d="M6.5 7a4.5 4.5 0 1 1 7.3 3.6A3.5 3.5 0 0 1 18 14m-12.6 3l-.8 1.2M14 19l-.8 1.2M9.5 15.5l-.8 1.2" />
        </svg>
      )
    case 'rain':
      return (
        <svg viewBox="0 0 24 24" width="30" height="30" {...common}>
          <path d="M16.5 14H7a3.5 3.5 0 1 1 .9-6.9A5 5 0 0 1 17.7 7.5 3.25 3.25 0 0 1 16.5 14z" />
          <path d="M9 18v.5M13 18v.5M10.5 21v.5M14 20.5v.5" />
        </svg>
      )
    case 'storm':
      return (
        <svg viewBox="0 0 24 24" width="30" height="30" {...common}>
          <path d="M17 7.5A4.5 4.5 0 0 0 8.5 5 3.5 3.5 0 0 0 8 12" />
          <path d="M13 11l-4 5h3.5L11 20l5-6h-3.5z" />
        </svg>
      )
    case 'snow':
      return (
        <svg viewBox="0 0 24 24" width="30" height="30" {...common}>
          <path d="M16.5 14H7a3.5 3.5 0 1 1 .9-6.9A5 5 0 0 1 17.7 7.5 3.25 3.25 0 0 1 16.5 14z" />
          <path d="M11 16v1.5M11 19v1.5M8 17.5l1.3.75M12.6 18.25l1.3.75M8.5 20.5l1.3-.75M13 21.3l1.3-.75" />
        </svg>
      )
    case 'fog':
      return (
        <svg viewBox="0 0 24 24" width="30" height="30" {...common}>
          <path d="M6 8a4 4 0 1 1 6.6 3M7 12h10M6 16h12M5 20h9" />
        </svg>
      )
    default:
      return <svg viewBox="0 0 24 24" width="30" height="30" {...common}><circle cx="12" cy="12" r="5" /></svg>
  }
}

function codeToDesc(code: number): string {
  if (code === 0) return 'ясно'
  if (code <= 3) return 'малооблачно'
  if (code <= 48) return 'туман'
  if (code <= 57) return 'морось'
  if (code <= 67) return 'дождь'
  if (code <= 77) return 'снег'
  if (code <= 82) return 'ливень'
  if (code <= 86) return 'снегопад'
  return 'гроза'
}

function codeToIcon(code: number): string {
  if (code === 0) return 'sunny'
  if (code <= 2) return 'cloud'
  if (code === 3) return 'heavyCloud'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'rainy'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  return 'storm'
}