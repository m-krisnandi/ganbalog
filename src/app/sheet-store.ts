import { create } from 'zustand'

/** Hitung sheet terbuka — dipakai untuk sembunyikan bottom nav saat modal aktif. */
export const useSheetStore = create<{ openCount: number }>(() => ({ openCount: 0 }))

export function sheetOpened(): void {
  useSheetStore.setState((s) => ({ openCount: s.openCount + 1 }))
}

export function sheetClosed(): void {
  useSheetStore.setState((s) => ({ openCount: Math.max(0, s.openCount - 1) }))
}

export function isSheetOpen(): boolean {
  return useSheetStore.getState().openCount > 0
}
