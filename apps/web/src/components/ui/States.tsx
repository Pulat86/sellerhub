import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import type { ReactNode } from 'react'

/**
 * Четыре обязательных состояния экрана.
 * Экран, у которого есть только «данные загрузились», в приёмку не проходит:
 * оператор увидит белое пятно ровно тогда, когда площадка не ответит.
 */

export function LoadingState({ rows = 4 }: { rows?: number }) {
  const { t } = useTranslation()
  const widths = ['62%', '100%', '88%', '74%', '93%', '68%']
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={t('states.loading')}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-sm bg-surface-sunken"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  )
}

function Shell({ tone, mark, title, children }: { tone: string; mark: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
      <div className={`grid size-9 place-items-center rounded-md font-display text-lead font-extrabold ${tone}`}>
        {mark}
      </div>
      <strong className="font-display text-lead">{title}</strong>
      {children}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title?: string; body?: string; action?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <Shell tone="bg-accent-soft text-accent" mark="+" title={title ?? t('states.emptyTitle')}>
      {body ? <p className="max-w-[40ch] text-small text-ink-muted">{body}</p> : null}
      {action}
    </Shell>
  )
}

export function ErrorState({ body, onRetry }: { body?: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <Shell tone="bg-danger-soft text-danger" mark="!" title={t('states.errorTitle')}>
      {body ? <p className="max-w-[40ch] text-small text-ink-muted">{body}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('states.retry')}
        </Button>
      ) : null}
    </Shell>
  )
}

export function NoAccessState() {
  const { t } = useTranslation()
  return (
    <Shell tone="bg-surface-sunken text-ink-muted" mark="×" title={t('states.noAccessTitle')}>
      <p className="max-w-[40ch] text-small text-ink-muted">{t('states.noAccessBody')}</p>
    </Shell>
  )
}
