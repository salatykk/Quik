import { CustomModuleId, CustomWidgetSpec } from '../../types'
import ClockContent from './ClockContent'
import WeatherContent from './WeatherContent'
import CryptoContent from './CryptoContent'
import MusicContent from './MusicContent'
import MapsContent from './MapsContent'
import './CustomWidgetContent.css'

const MODULES: Record<CustomModuleId, React.ComponentType> = {
  clock: ClockContent,
  weather: WeatherContent,
  crypto: CryptoContent,
  music: MusicContent,
  maps: MapsContent
}

const MODULE_LABEL: Record<CustomModuleId, string> = {
  clock: 'Часы',
  weather: 'Погода',
  crypto: 'Крипта',
  music: 'Музыка',
  maps: 'Карты'
}

interface Props {
  spec: CustomWidgetSpec
}

export default function CustomWidgetContent({ spec }: Props) {
  const modules = spec.modules || []

  return (
    <div className="cw-custom w-content">
      {spec.title && (
        <div className="cw-c-head">
          <span className="cw-c-title" title={spec.title}>{spec.title}</span>
        </div>
      )}
      {spec.text && (
        <div className="cw-c-text" title={spec.text}>{spec.text}</div>
      )}
      <div className="cw-c-modules">
        {modules.length === 0 && (
          <div className="cw-c-empty">
            <span className="cw-c-empty-ic">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="6" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </span>
            <span className="cw-c-empty-t">Добавьте модули в настройках</span>
          </div>
        )}
        {modules.map((m, i) => {
          const Comp = MODULES[m]
          return (
            <div key={m + i} className="cw-c-module">
              <span className="cw-c-module-label">{MODULE_LABEL[m]}</span>
              <div className="cw-c-module-body">
                <Comp />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}