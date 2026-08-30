import { useTranslation } from 'react-i18next'
import { EmptyState } from '../components/ui/States'

/**
 * Заглушка раздела на время Sprint 0.
 * Показывает честное «в работе», а не пустой экран.
 */
export function Placeholder({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">{t(titleKey)}</h1>
      <EmptyState title={t('soon.title')} body={t('soon.body')} />
    </div>
  )
}
