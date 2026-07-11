import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { consumeFlashToast } from './flash-toast'
import { useToastStore } from './toast-store'

export function useFlashToast(): void {
  const { t } = useTranslation()

  useEffect(() => {
    const flash = consumeFlashToast()
    if (!flash) return
    useToastStore.getState().show(t(flash.messageKey), flash.kind)
  }, [t])
}
