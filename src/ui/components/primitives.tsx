import type { LucideIcon } from 'lucide-react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

const surfaceBorder =
  'border border-border-subtle dark:border-border-subtle-dark'

export function PageHeader({
  title,
  subtitle,
  trailing,
  children,
  onClick,
  actionLabel,
}: {
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
  onClick?: () => void
  actionLabel?: string
}) {
  const body = (
    <>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
        {trailing}
      </div>
      {children}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={actionLabel}
        className={`w-full rounded-xl ${surfaceBorder} bg-surface-raised/80 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/80 dark:bg-surface-raised-dark/80 dark:hover:bg-surface-muted-dark/80`}
      >
        {body}
      </button>
    )
  }

  return (
    <header className={`rounded-xl ${surfaceBorder} bg-surface-raised/80 px-4 py-3.5 dark:bg-surface-raised-dark/80`}>
      {body}
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl ${surfaceBorder} bg-surface-raised p-4 dark:bg-surface-raised-dark ${className}`}
    >
      {children}
    </div>
  )
}

/** Flat list container — replaces Card p-0 + divide-y stacks. */
export function ListPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`divide-y divide-border-subtle overflow-hidden rounded-xl ${surfaceBorder} bg-surface-raised dark:divide-border-subtle-dark dark:bg-surface-raised-dark ${className}`}
    >
      {children}
    </div>
  )
}

export function ListRow({
  children,
  className = '',
  onClick,
  as: Tag = onClick ? 'button' : 'div',
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  as?: 'div' | 'button'
}) {
  const base = `flex w-full items-center gap-3 px-4 py-3.5 text-left ${onClick ? 'cursor-pointer transition-colors hover:bg-surface-muted/60 dark:hover:bg-surface-muted-dark/40' : ''} ${className}`
  if (Tag === 'button') {
    return (
      <button type="button" onClick={onClick} className={base}>
        {children}
      </button>
    )
  }
  return <div className={base}>{children}</div>
}

export function StatTile({
  value,
  label,
  onClick,
}: {
  value: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[72px] cursor-pointer rounded-xl ${surfaceBorder} bg-surface-raised px-2 py-3 text-center transition-colors active:scale-[0.98] hover:border-accent/25 hover:bg-surface-muted/40 dark:bg-surface-raised-dark dark:hover:bg-surface-muted-dark/40`}
    >
      <p className="text-2xl font-bold tabular-nums text-accent">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-snug text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
    </button>
  )
}

export function EmptyPanel({
  icon: Icon,
  text,
  actionLabel,
  onAction,
  className = '',
}: {
  icon: LucideIcon
  text: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-dashed ${surfaceBorder} bg-surface-muted/30 px-4 dark:bg-surface-muted-dark/20 ${className}`}
    >
      <EmptyState icon={Icon} text={text} actionLabel={actionLabel} onAction={onAction} compact />
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
      {children}
    </h2>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'success'
}

export function Button({ variant = 'primary', className = '', disabled, ...props }: ButtonProps) {
  const styles = {
    primary:
      'bg-accent text-white shadow-soft hover:bg-accent-strong active:scale-[0.98] disabled:opacity-50',
    success:
      'bg-success text-white shadow-soft hover:bg-success-strong active:scale-[0.98] disabled:opacity-50',
    ghost:
      'bg-surface-muted text-zinc-700 hover:bg-zinc-200/80 dark:bg-surface-muted-dark dark:text-zinc-200 dark:hover:bg-zinc-700',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400',
  }[variant]

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${styles} ${className}`}
      {...props}
    />
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-border-subtle bg-surface-raised px-3.5 py-2.5 text-base outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-inset focus:ring-accent/25 dark:border-border-subtle-dark dark:bg-surface-muted-dark ${props.className ?? ''}`}
    />
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`w-full resize-y rounded-xl border border-border-subtle bg-surface-raised px-3.5 py-2.5 text-base leading-relaxed outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-inset focus:ring-accent/25 dark:border-border-subtle-dark dark:bg-surface-muted-dark ${props.className ?? ''}`}
    />
  )
}

export function EmptyState({
  icon: Icon,
  text,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon: LucideIcon
  text: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 text-center ${compact ? 'py-8' : 'py-10'}`}
    >
      <div
        className={`flex items-center justify-center rounded-xl bg-surface-muted text-zinc-400 dark:bg-surface-muted-dark dark:text-zinc-500 ${compact ? 'size-12' : 'size-14'}`}
      >
        <Icon size={compact ? 22 : 24} strokeWidth={1.75} aria-hidden />
      </div>
      <p className="max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{text}</p>
      {actionLabel && onAction && (
        <Button className="mt-1 min-h-[44px]" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
        active
          ? 'bg-accent text-white shadow-soft'
          : 'bg-surface-muted text-zinc-600 hover:bg-zinc-200/80 dark:bg-surface-muted-dark dark:text-zinc-300 dark:hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}
