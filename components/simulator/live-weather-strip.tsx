import type { LiveWeather } from '@/lib/sources/openMeteo'

interface LiveWeatherStripProps {
  weather: LiveWeather
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

export function LiveWeatherStrip({ weather }: LiveWeatherStripProps) {
  const windLabel = windDegToLabel(weather.windDirDeg)
  const timeLabel = formatIST(weather.observedAt)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-sky-900/50 bg-sky-950/30 px-4 py-3 text-sm">
      <span className="font-semibold text-sky-300">Live in Bangalore</span>
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
      <span className="ml-auto text-xs text-muted-foreground/70">
        as of {timeLabel} IST · Open-Meteo · 15 min cache
      </span>
    </div>
  )
}
