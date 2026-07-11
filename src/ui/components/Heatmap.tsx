import { addDays, format, parseISO, startOfWeek, subWeeks } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { dateLocale } from '../../app/i18n'

interface HeatmapProps {
  counts: Map<string, number>
  weeks?: number
  onSelectDate?: (date: string) => void
}

function cellClass(count: number): string {
  if (count === 0) return 'bg-surface-muted dark:bg-surface-muted-dark'
  if (count <= 1) return 'bg-accent/35'
  if (count <= 3) return 'bg-accent/65'
  return 'bg-accent'
}

export function Heatmap({ counts, weeks = 18, onSelectDate }: HeatmapProps) {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const today = new Date()
  const firstWeekStart = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 1 })

  const columns: Date[][] = []
  for (let w = 0; w < weeks; w++) {
    const column: Date[] = []
    for (let d = 0; d < 7; d++) {
      column.push(addDays(firstWeekStart, w * 7 + d))
    }
    columns.push(column)
  }

  const monthLabels = columns.map((column, index) => {
    const firstDay = column[0]
    const prev = index > 0 ? columns[index - 1][0] : null
    const isNewMonth = !prev || prev.getMonth() !== firstDay.getMonth()
    return isNewMonth ? format(firstDay, 'MMM', { locale }) : ''
  })

  return (
    <div className="overflow-x-auto pb-1" aria-label={t('progress.heatmapAria')}>
      <div className="mb-2 flex items-center gap-3 text-[10px] text-zinc-400">
        <span>{t('progress.heatmapLess')}</span>
        <div className="flex gap-1">
          {[0, 1, 2, 4].map((level) => (
            <div
              key={level}
              className={`size-3.5 rounded-[4px] ${cellClass(level)}`}
              aria-hidden
            />
          ))}
        </div>
        <span>{t('progress.heatmapMore')}</span>
      </div>
      <div className="flex gap-1 text-[9px] text-zinc-400" style={{ minWidth: weeks * 18 }}>
        {monthLabels.map((label, i) => (
          <div key={i} className="w-3.5 shrink-0">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1" style={{ minWidth: weeks * 18 }}>
        {columns.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-1">
            {column.map((day) => {
              const iso = format(day, 'yyyy-MM-dd')
              const count = counts.get(iso) ?? 0
              const future = day > today
              const label = `${format(parseISO(iso), 'd MMM yyyy', { locale })}: ${t('progress.heatmapTasks', { count })}`
              const cellClassName = `size-3.5 shrink-0 rounded-[4px] transition-transform duration-150 ${
                future ? 'bg-transparent' : cellClass(count)
              }`

              if (future || !onSelectDate) {
                return (
                  <div key={iso} title={label} aria-hidden={future} className={cellClassName} />
                )
              }

              return (
                <button
                  key={iso}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => onSelectDate(iso)}
                  className={`cursor-pointer hover:scale-110 focus:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${cellClassName}`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
