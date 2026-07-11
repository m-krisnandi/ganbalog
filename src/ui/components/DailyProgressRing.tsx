interface DailyProgressRingProps {
  done: number
  total: number
  size?: number
  label?: string
}

export function DailyProgressRing({ done, total, size = 72, label }: DailyProgressRingProps) {
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = total > 0 ? done / total : 0
  const offset = circumference * (1 - ratio)
  const complete = total > 0 && done >= total

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-zinc-200 dark:text-zinc-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-[stroke-dashoffset] duration-200 ease-out ${
            complete ? 'text-success' : 'text-accent'
          }`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-lg leading-none font-bold tabular-nums ${
            complete ? 'text-success' : 'text-accent'
          }`}
        >
          {done}
        </span>
        <span className="text-[10px] text-zinc-400">/{total || '—'}</span>
      </div>
    </div>
  )
}
