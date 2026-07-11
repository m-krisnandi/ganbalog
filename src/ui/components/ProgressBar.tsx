interface ProgressBarProps {
  value: number
  max: number
}

export function ProgressBar({ value, max }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted dark:bg-surface-muted-dark"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          ratio >= 1 ? 'bg-success' : 'bg-accent'
        }`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}
