interface WordmarkProps {
  showTagline?: boolean
  className?: string
}

export function Wordmark({ showTagline = true, className }: WordmarkProps) {
  return (
    <div className={className}>
      <span
        className="text-xl font-display italic leading-none tracking-tight text-foreground"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Taap
      </span>
      {showTagline && (
        <p
          className="hidden sm:block text-[10px] leading-none text-muted-foreground tracking-wide"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Why Indian cities get hot
        </p>
      )}
    </div>
  )
}
