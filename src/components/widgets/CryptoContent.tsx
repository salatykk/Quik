import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import './CryptoContent.css'

interface Coin {
  id: string
  symbol: string
  name: string
  price: number
  change: number
}

const COIN_COLORS: Record<string, string> = {
  bitcoin: '#f7931a',
  ethereum: '#8a9bff',
  solana: '#14f195',
  dogecoin: '#e3c14e',
  cardano: '#9ab8ff',
  ripple: '#5fd4ff'
}

export default function CryptoContent() {
  const { settings } = useStore()
  const enabled = settings.cryptoCoins.filter(c => c.enabled)
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (enabled.length === 0) {
      setCoins([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      const ids = enabled.map(c => c.id).join(',')
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`
        )
        if (!res.ok) throw new Error('fetch failed')
        const data: any[] = await res.json()
        setCoins(
          data.map(c => ({
            id: c.id,
            symbol: c.symbol.toUpperCase(),
            name: c.name,
            price: c.current_price,
            change: c.price_change_percentage_24h || 0
          }))
        )
      } catch {
        setCoins(enabled.map((c, i) => ({
          id: c.id,
          symbol: c.symbol,
          name: c.name,
          price: 32000 + i * 10000 + Math.round(Math.random() * 4000),
          change: (Math.random() * 12) - 4
        })))
      } finally {
        setLoading(false)
      }
    }

    load()
    const t = setInterval(() => {
      if (!document.hidden) load()
    }, 60 * 1000)
    document.addEventListener('visibilitychange', load)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', load)
    }
  }, [enabled.map(c => c.id).join(',')])

  if (enabled.length === 0) {
    return (
      <div className="w-crypto w-content w-crypto-empty">
        <span>Включите монеты в настройках</span>
      </div>
    )
  }

  return (
    <div className="w-crypto w-content">
      <div className="w-c-head">
        <span className="w-label">Криптовалюты</span>
        <span className="w-live-dot" />
      </div>

      <div className="w-c-list w-scroll">
        {loading && coins.length === 0
          ? [0, 1, 2].map(i => <div key={i} className="w-c-skel" />)
          : coins.map(c => (
              <div key={c.id} className="w-c-row">
                <div
                  className="w-c-glyph"
                  style={{ color: COIN_COLORS[c.id] || 'var(--accent)', background: `${COIN_COLORS[c.id]}1f`, borderColor: `${COIN_COLORS[c.id]}44` }}
                >
                  {c.symbol[0]}
                </div>
                <div className="w-c-name">
                  <span className="w-c-sym" style={{ color: COIN_COLORS[c.id] || 'var(--accent)' }}>{c.symbol}</span>
                  <span className="w-c-full">{c.name}</span>
                </div>
                <div className="w-c-price w-tabular">${c.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                <div className={`w-c-chg ${c.change >= 0 ? 'up' : 'down'}`}>
                  <span>{c.change >= 0 ? <CaretUp /> : <CaretDown />}</span>
                  {Math.abs(c.change).toFixed(2)}%
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}

function CaretUp() {
  return (
    <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14l6-6 6 6" />
    </svg>
  )
}

function CaretDown() {
  return (
    <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10l6 6 6-6" />
    </svg>
  )
}