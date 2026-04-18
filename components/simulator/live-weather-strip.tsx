import type { LiveWeather } from '@/lib/sources/openMeteo'
import type { LiveAq } from '@/lib/sources/openAQ'

interface LiveWeatherStripProps {
  cityName: string
  weather: LiveWeather
  liveAq?: LiveAq | null
}

function windDegToLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const idx = Math.round(deg / 45) % 8
  return dirs[idx]
}

function formatIST(isoString: string): string {
  try {
    // Open-Meteo returns local time already for Asia/Kolkata timezone
    // Format: "2024-04-17T14:30" — extract HH:MM
    const timePart = isoString.includes('T') ? isoString.split('T')[1] : ''
    const hhmm = timePart.slice(0, 5)
    return hhmm || isoString
  } catch {
    return isoString
  }
}

// OpenAQ timestamps are UTC — convert to IST for display
function formatUtcToIST(isoUtc: string): string {
  try {
    return new Date(isoUtc).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return isoUtc
  }
}

export function LiveWeatherStrip({ cityName, weather, liveAq }: LiveWeatherStripProps) {
  const windLabel = windDegToLabel(weather.windDirDeg)
  const timeLabel = formatIST(weather.observedAt)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-sky-900/50 bg-sky-950/30 px-4 py-3 text-sm">
      <span className="font-semibold text-sky-300">Live in {cityName}</span>
      <span className="text-foreground">
        <span className="font-mono text-lg font-bold text-sky-200">{weather.tempC}°C</span>
      </span>
      <span className="text-muted-foreground">{weather.summary}</span>
      <span className="text-muted-foreground">
        Wind {weather.windSpeedKmh} km/h from {windLabel}
      </span>
      <span className="text-muted-foreground">
        Humidity {weather.humidityPct}%
      </span>
      {liveAq && (
        <>
          <span className="h-3 w-px bg-sky-900/60" aria-hidden />
          <span className="font-mono font-bold text-purple-300">
            PM2.5 · {liveAq.valueUgm3} µg/m³
          </span>
          <span className="text-xs text-muted-foreground/70">
            {liveAq.stationCount} CPCB/state-board stations · as of {formatUtcToIST(liveAq.observedAt)} IST
          </span>
        </>
      )}
      <span className="ml-auto text-xs text-muted-foreground/70">
        as of {timeLabel} IST · Open-Meteo · 15 min cache
      </span>
    </div>
  )
}
