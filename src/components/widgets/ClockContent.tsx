import { useState, useEffect } from 'react'
import './ClockContent.css'

export default function ClockContent() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) setNow(new Date())
    }
    const t = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const hh = now.getHours().toString().padStart(2, '0')
  const mm = now.getMinutes().toString().padStart(2, '0')
  const ss = now.getSeconds().toString().padStart(2, '0')

  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ]

  return (
    <div className="w-clock w-content">
      <div className="w-clock-row">
        <div className="w-clock-num">{hh}</div>
        <div className="w-clock-colon">:</div>
        <div className="w-clock-num">{mm}</div>
        <div className="w-clock-sec">{ss}</div>
      </div>
      <div className="w-clock-date">
        {days[now.getDay()]}, {now.getDate()} {months[now.getMonth()]}
      </div>
      <div className="w-clock-line" />
    </div>
  )
}