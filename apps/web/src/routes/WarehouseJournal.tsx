import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import { STOCK_PAGE_SIZE, formatQty, useStockJournal, useWarehouses } from '../lib/warehouse'

function Head({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      scope="col"
      className={`sticky top-0 z-10 border-b border-line-strong bg-surface px-3 py-2 font-display text-micro font-bold uppercase tracking-wider text-ink-faint ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

export function WarehouseJournal() {
  const { t, i18n } = useTranslation()
  const { currentTenant } = useAuth()
  const tenantId = currentTenant?.tenant.id

  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(0)

  const warehouses = useWarehouses(tenantId)
  const journal = useStockJournal(tenantId, { warehouseId, page })

  const total = journal.data?.total ?? 0
  const lastPage = Math.max(0, Math.ceil(total / STOCK_PAGE_SIZE) - 1)

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t('wms.journal')}</h1>
        <Link to="/warehouse">
          <Button variant="secondary" size="sm">
            {t('wms.stock')}
          </Button>
        </Link>
      </div>

      <p className="max-w-prose text-small text-ink-muted">{t('wms.appendOnlyNote')}</p>

      <select
        value={warehouseId}
        onChange={(e) => {
          setWarehouseId(e.target.value)
          setPage(0)
        }}
        aria-label={t('wms.warehouse')}
        className="w-fit rounded-md border border-line-strong bg-surface px-3 py-2 text-ink hover:border-ink-faint focus:border-accent"
      >
        <option value="">{t('wms.allWarehouses')}</option>
        {(warehouses.data ?? []).map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>

      {journal.isPending ? (
        <LoadingState rows={8} />
      ) : journal.isError ? (
        <ErrorState
          body={journal.error instanceof Error ? journal.error.message : undefined}
          onRetry={() => void journal.refetch()}
        />
      ) : journal.data.rows.length === 0 ? (
        <EmptyState title={t('wms.emptyJournal')} body={t('wms.emptyJournalBody')} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full border-collapse text-small">
              <thead>
                <tr>
                  <Head>{t('wms.when')}</Head>
                  <Head>{t('wms.product')}</Head>
                  <Head>{t('wms.warehouse')}</Head>
                  <Head right>{t('wms.qty')}</Head>
                  <Head>{t('wms.operation')}</Head>
                  <Head>{t('wms.document')}</Head>
                  <Head>{t('wms.who')}</Head>
                </tr>
              </thead>
              <tbody>
                {journal.data.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-hover">
                    <td className="border-b border-line px-3 py-2.5 text-ink-muted">
                      {dateFmt.format(new Date(r.created_at))}
                    </td>
                    <td className="border-b border-line px-3 py-2.5">
                      <span className="text-ink">{r.product_name}</span>
                      <br />
                      <code className="text-mini text-ink-faint">{r.sku}</code>
                    </td>
                    <td className="border-b border-line px-3 py-2.5 text-ink-muted">
                      {r.warehouse_name}
                    </td>
                    {/* Приход и расход различаются знаком и цветом: в журнале
                        учёта направление движения важнее самого числа. */}
                    <td
                      className={`border-b border-line px-3 py-2.5 text-right font-medium ${
                        r.qty < 0 ? 'text-danger' : 'text-accent'
                      }`}
                    >
                      {r.qty > 0 ? '+' : ''}
                      {formatQty(r.qty, i18n.language)}
                    </td>
                    <td className="border-b border-line px-3 py-2.5 text-ink-muted">
                      {t(`wms.reasons.${r.reason}`)}
                    </td>
                    <td className="border-b border-line px-3 py-2.5 text-ink-muted">
                      {r.doc_ref ?? '\u2014'}
                    </td>
                    <td className="border-b border-line px-3 py-2.5 text-ink-muted">
                      {r.actor_name ?? '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastPage > 0 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                {t('catalog.prev')}
              </Button>
              <span className="text-small text-ink-muted">
                {page + 1} / {lastPage + 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                {t('catalog.next')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
