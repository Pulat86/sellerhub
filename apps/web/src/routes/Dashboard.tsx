import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { ErrorState, LoadingState } from '../components/ui/States'
import { formatMoney, formatNumber, useDashboard } from '../lib/dashboard'

const WRITE_ROLES = ['owner', 'admin', 'manager']

/** Карточка показателя. Значение крупно, пояснение мелко под ним. */
function Metric({
  label,
  value,
  hint,
  tone = 'normal',
  to,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'normal' | 'danger'
  to?: string
}) {
  const body = (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-ink-faint">
      <span className="font-display text-micro font-bold uppercase tracking-wider text-ink-faint">
        {label}
      </span>
      <span
        className={`font-display text-2xl font-bold tracking-tight ${
          tone === 'danger' ? 'text-danger' : 'text-ink'
        }`}
      >
        {value}
      </span>
      {hint ? <span className="text-small text-ink-muted">{hint}</span> : null}
    </div>
  )

  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}

export function Dashboard() {
  const { t, i18n } = useTranslation()
  const { currentTenant } = useAuth()
  const tenantId = currentTenant?.tenant.id
  const canWrite = currentTenant ? WRITE_ROLES.includes(currentTenant.role) : false

  const summary = useDashboard(tenantId)
  const locale = i18n.language

  if (summary.isPending) return <LoadingState rows={6} />

  if (summary.isError) {
    return (
      <ErrorState
        body={summary.error instanceof Error ? summary.error.message : undefined}
        onRetry={() => void summary.refetch()}
      />
    )
  }

  const d = summary.data
  const empty = d.products_total === 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="font-display text-2xl font-bold tracking-tight">{t('nav.dashboard')}</h1>
          <span className="text-small text-ink-muted">{currentTenant?.tenant.name}</span>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Link to="/catalog/new">
              <Button variant="secondary">{t('catalog.add')}</Button>
            </Link>
            <Link to="/warehouse">
              <Button>{t('wms.newOperation')}</Button>
            </Link>
          </div>
        ) : null}
      </div>

      {/* Пустая система — это не ошибка, а начало работы.
          Вместо пустых нулей объясняем, с чего начать. */}
      {empty ? (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
          <h2 className="font-display text-lead font-bold">{t('dash.startTitle')}</h2>
          <p className="max-w-prose text-small text-ink-muted">{t('dash.startBody')}</p>
          <ol className="flex max-w-prose flex-col gap-2 text-small text-ink">
            <li>1. {t('dash.step1')}</li>
            <li>2. {t('dash.step2')}</li>
            <li>3. {t('dash.step3')}</li>
          </ol>
          {canWrite ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to="/catalog/references">
                <Button size="sm" variant="secondary">
                  {t('catalog.references')}
                </Button>
              </Link>
              <Link to="/catalog/new">
                <Button size="sm">{t('catalog.add')}</Button>
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Показатели, которые можно посчитать честно.
          Выручки и заказов здесь нет намеренно: маркетплейсы не подключены,
          и рисовать пустой график продаж значило бы показывать несуществующее. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label={t('dash.products')}
          value={formatNumber(d.products_total, locale)}
          hint={t('dash.variantsHint', { n: formatNumber(d.variants_total, locale) })}
          to="/catalog"
        />
        <Metric
          label={t('dash.stockUnits')}
          value={formatNumber(d.stock_units, locale)}
          hint={t('dash.warehousesHint', { n: formatNumber(d.warehouses_total, locale) })}
          to="/warehouse"
        />
        <Metric
          label={t('dash.stockCost')}
          value={formatMoney(d.stock_cost, locale)}
          hint={t('dash.stockCostHint')}
          to="/warehouse"
        />
        <Metric
          label={t('dash.movements')}
          value={formatNumber(d.movements_7d, locale)}
          hint={t('dash.movementsHint', {
            in: formatNumber(d.received_7d, locale),
            out: formatNumber(d.shipped_7d, locale),
          })}
          to="/warehouse/journal"
        />
      </div>

      {/* То, что требует внимания. Показывается только когда есть повод —
          пустая панель предупреждений приучает их не замечать. */}
      {d.negative_positions > 0 || d.products_no_stock > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lead font-bold">{t('dash.attention')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {d.negative_positions > 0 ? (
              <Metric
                label={t('dash.negative')}
                value={formatNumber(d.negative_positions, locale)}
                hint={t('dash.negativeHint')}
                tone="danger"
                to="/warehouse"
              />
            ) : null}
            {d.products_no_stock > 0 ? (
              <Metric
                label={t('dash.noStock')}
                value={formatNumber(d.products_no_stock, locale)}
                hint={t('dash.noStockHint')}
                to="/catalog"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Честно о том, чего ещё нет. Пустой график продаж выглядел бы
          как поломка; объяснение — как план. */}
      <div className="rounded-lg border border-line bg-surface-sunken p-5">
        <h2 className="font-display text-lead font-bold">{t('dash.nextTitle')}</h2>
        <p className="mt-2 max-w-prose text-small text-ink-muted">{t('dash.nextBody')}</p>
      </div>
    </div>
  )
}
