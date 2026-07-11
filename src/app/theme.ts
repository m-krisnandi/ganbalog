import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'ganbalog-theme' },
  ),
)

export function applyTheme(mode: ThemeMode): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0c0a09' : '#f4f4f5')
}

/** Ikuti perubahan tema OS secara live saat mode = system. */
export function watchSystemTheme(): void {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => applyTheme(useThemeStore.getState().mode))
}
