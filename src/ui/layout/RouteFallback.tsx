import { useTranslation } from 'react-i18next'
import { PageLoadingSkeleton } from '../components/PageLoadingSkeleton'

export function RouteFallback() {
  const { t } = useTranslation()
  return <PageLoadingSkeleton label={t('common.loading')} />
}
