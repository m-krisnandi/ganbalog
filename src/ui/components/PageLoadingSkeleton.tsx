export function PageLoadingSkeleton({ label }: { label: string }) {
  return (
    <div
      className="space-y-6 pt-6 motion-safe:animate-pulse"
      aria-busy="true"
      aria-label={label}
      role="status"
    >
      <div className="h-24 rounded-3xl bg-surface-muted dark:bg-surface-muted-dark" />
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-surface-muted dark:bg-surface-muted-dark" />
        <div className="h-20 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark" />
        <div className="h-20 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark" />
        <div className="h-20 rounded-2xl bg-surface-muted dark:bg-surface-muted-dark" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}
