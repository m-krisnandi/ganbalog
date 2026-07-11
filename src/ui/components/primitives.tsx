import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900 ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
      {children}
    </h2>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
}

export function Button({ variant = 'primary', className = '', disabled, ...props }: ButtonProps) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-strong disabled:opacity-50',
    ghost:
      'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400',
  }[variant]

  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-800 ${props.className ?? ''}`}
    />
  )
}

export function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        <Icon size={22} strokeWidth={1.75} aria-hidden />
      </div>
      <p className="max-w-xs text-sm text-zinc-400">{text}</p>
    </div>
  )
}
