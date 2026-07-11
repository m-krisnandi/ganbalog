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
      className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}
