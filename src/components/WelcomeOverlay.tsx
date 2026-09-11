import { useEffect, useState } from 'react'
import './WelcomeOverlay.css'

export default function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 60)
    const t2 = setTimeout(() => setPhase('exit'), 2400)
    const t3 = setTimeout(onDone, 3000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <div className={`wo ${phase}`}>
      <div className="wo-glow" />
      <div className="wo-logo">Q</div>
      <div className="wo-title">Добро пожаловать в Quik</div>
      <div className="wo-sub">виджеты · оверлей · каждый день</div>
    </div>
  )
}