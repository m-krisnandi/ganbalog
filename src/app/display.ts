import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TextSize = 'default' | 'large'
export type ContrastMode = 'default' | 'high'

interface DisplayState {
  textSize: TextSize
  contrast: ContrastMode
  reminderEnabled: boolean
  reminderHour: number
  setTextSize: (size: TextSize) => void
  setContrast: (contrast: ContrastMode) => void
  setReminderEnabled: (enabled: boolean) => void
  setReminderHour: (hour: number) => void
}

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      textSize: 'default',
      contrast: 'default',
      reminderEnabled: false,
      reminderHour: 19,
      setTextSize: (textSize) => set({ textSize }),
      setContrast: (contrast) => set({ contrast }),
      setReminderEnabled: (reminderEnabled) => set({ reminderEnabled }),
      setReminderHour: (reminderHour) => set({ reminderHour }),
    }),
    { name: 'ganbalog-display' },
  ),
)

export function applyTextSize(size: TextSize): void {
  document.documentElement.dataset.textSize = size === 'large' ? 'large' : ''
}

export function applyContrast(mode: ContrastMode): void {
  document.documentElement.dataset.contrast = mode === 'high' ? 'high' : ''
}
