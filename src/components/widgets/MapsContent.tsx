import { useState } from 'react'
import './MapsContent.css'

interface Place {
  name: string
  country: string
  lat: number
  lon: number
  type: string
}

export default function MapsContent() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [selected, setSelected] = useState<Place | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=4&q=${encodeURIComponent(query)}`
      )
      const data: any[] = await res.json()
      setResults(
        data.map(p => ({
          name: p.display_name.split(',')[0],
          country: p.display_name.split(',').pop()?.trim() || '',
          lat: parseFloat(p.lat),
          lon: parseFloat(p.lon),
          type: p.type
        }))
      )
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-maps w-content">
      <div className="w-maps-head">
        <span className="w-label">Карты</span>
        <button
          className="w-maps-geo"
          onClick={() => {
            navigator.geolocation?.getCurrentPosition(pos => {
              setSelected({ name: 'Моя геолокация', country: '', lat: pos.coords.latitude, lon: pos.coords.longitude, type: '' })
            })
          }}
          title="Мое местоположение"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      </div>

      <form className="w-maps-search" onSubmit={search}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Страна, город, улица…"
        />
        {loading ? (
          <span className="w-maps-spin" />
        ) : (
          <button type="submit" className="w-maps-go">Искать</button>
        )}
      </form>

      {results.length > 0 && (
        <div className="w-maps-results">
          {results.map((r, i) => (
            <button key={i} className={`w-maps-result ${selected === r ? 'active' : ''}`} onClick={() => setSelected(r)}>
              <span className="w-maps-pin">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span className="w-maps-rname">{r.name}</span>
              <span className="w-maps-rtype">{r.type}</span>
            </button>
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="w-maps-none">Ничего не найдено</div>
      )}

      {selected ? (
        <div className="w-maps-view">
          <div className="w-maps-coords w-tabular">
            {selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}
          </div>
          <div className="w-maps-embed">
            <iframe
              title="map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selected.lon - 0.008}%2C${selected.lat - 0.008}%2C${selected.lon + 0.008}%2C${selected.lat + 0.008}&layer=mapnik&marker=${selected.lat}%2C${selected.lon}`}
              loading="lazy"
            />
          </div>
        </div>
      ) : (
        !searched && (
          <div className="w-maps-placeholder">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M1 6v16M1 6l8-4 8 4 6-3v16l-6 3-8-4-8 4V6z" />
              <path d="M9 2v20M17 6v16" />
            </svg>
            <span>Найдите любое место на карте</span>
          </div>
        )
      )}
    </div>
  )
}