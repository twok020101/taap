interface LogoProps {
  size?: number
  className?: string
}

/**
 * Taap logo — stylized sun with heat rings over a city skyline silhouette.
 * Renders cleanly at 24 px (header) and 64 px (globe overlay).
 */
export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Taap logo"
    >
      {/* Outer heat ring — faintest */}
      <circle
        cx="32"
        cy="28"
        r="22"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.25"
        strokeDasharray="3 3"
      />
      {/* Middle heat ring */}
      <circle
        cx="32"
        cy="28"
        r="16"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.45"
        strokeDasharray="4 2"
      />
      {/* Sun core */}
      <circle cx="32" cy="28" r="9" fill="currentColor" opacity="0.95" />

      {/* Sun rays — 8 short spokes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x1 = 32 + Math.cos(rad) * 11
        const y1 = 28 + Math.sin(rad) * 11
        const x2 = 32 + Math.cos(rad) * 14
        const y2 = 28 + Math.sin(rad) * 14
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />
        )
      })}

      {/* City skyline silhouette — bottom strip */}
      {/* Buildings as filled rectangles creating a jagged skyline */}
      <rect x="4" y="50" width="6" height="10" fill="currentColor" opacity="0.7" rx="0.5" />
      <rect x="11" y="45" width="5" height="15" fill="currentColor" opacity="0.7" rx="0.5" />
      <rect x="17" y="48" width="7" height="12" fill="currentColor" opacity="0.7" rx="0.5" />
      <rect x="25" y="42" width="6" height="18" fill="currentColor" opacity="0.7" rx="0.5" />
      <rect x="32" y="46" width="5" height="14" fill="currentColor" opacity="0.7" rx="0.5" />
      <rect x="38" y="44" width="8" height="16" fill="currentColor" opacity="0.7" rx="0.5" />
      <rect x="47" y="49" width="5" height="11" fill="currentColor" opacity="0.7" rx="0.5" />
      <rect x="53" y="47" width="7" height="13" fill="currentColor" opacity="0.7" rx="0.5" />
      {/* Ground line */}
      <rect x="0" y="59" width="64" height="5" fill="currentColor" opacity="0.5" rx="1" />
    </svg>
  )
}
