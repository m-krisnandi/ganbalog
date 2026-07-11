import { create } from 'zustand'

export type ToastKind = 'error' | 'success'

export interface ToastItem {
  id: string
  message: string
  kind: ToastKind
  actionLabel?: string
  onAction?: () => void
}

interface ToastState {
  toasts: ToastItem[]
  show: (message: string, kind?: ToastKind, action?: { label: string; onAction: () => void }) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, kind = 'error', action) => {
    const id = crypto.randomUUID()
    set({
      toasts: [
        ...get().toasts,
        {
          id,
          message,
          kind,
          actionLabel: action?.label,
          onAction: action?.onAction,
        },
      ],
    })
    window.setTimeout(() => get().dismiss(id), action ? 8000 : 4500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))
