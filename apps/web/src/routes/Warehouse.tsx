import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Select } from '../components/ui/Select'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import {
  STOCK_PAGE_SIZE,
  formatQty,
  useStockMove,
  useStockReport,
  useTransferStock,
  useVariantSearch,
  useWarehouses,
  type SimpleReason,
  type VariantOption,
} from '../lib/warehouse'

const WRITE_ROLES = ['owner', 'admin', 'manager', 'warehouse']

type OpKind = 'receipt' | 'writeoff' | 'transfer' | 'correction'

/**
 * Выбор товара для операции.
 *
 * Отдельный компонент, потому что тот же поиск понадобится инвентаризации
 * и сканеру штрихкодов: там будет тот же запрос, только вводить будет сканер.
 */
function VariantPicker({
  tenantId,
  chosen,
  onChoose,
}: {
  tenantId: string | undefined
  chosen: VariantOption | null
  onChoose: (v: VariantOption | null) => void
}) {
  const { t } = useTranslation()
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 300)
    return () => clearTimeout(id)
  }, [term])

  const found = useVariantSearch(tenantId, debounced)

  if (chosen) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-line-strong bg-surface-sunken px-3 py-2">
        <div className="flex flex-col">
          <span className="text-ink">{chosen.productName}</span>
          <code className="text-mini text-ink-faint">{chosen.sku}</code>
        </div>
        <Button size="sm" variant="secondary" onClick={() => onChoose(null)}>
          {t('catalog.cancel')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Field
        label={t('wms.product')}
        hint={t('wms.searchPlaceholder')}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      {found.isFetching ? (
        <span className="text-small text-ink-muted">{t('states.loading')}</span>
      ) : null}

      {found.data && found.data.length > 0 ? (
        <ul className="max-h-56 overflow-y-auto rounded-md border border-line">
          {found.data.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onChoose(v)}
                className="flex w-full flex-col items-start border-b border-line px-3 py-2 text-left last:border-0 hover:bg-surface-hover"
              >
                <span className="text-ink">{v.productName}</span>
                <code className="text-mini text-ink-faint">
                  {v.sku}
                  {v.barcode ? ` \u00b7 ${v.barcode}` : ''}
                </code>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {found.data && found.data.length === 0 && debounced.length >= 2 ? (
        <span className="text-small text-ink-muted">{t('catalog.noMatchTitle')}</span>
      ) : null}
    </div>
  )
}

export function Warehouse() {
  const { t, i18n } = useTranslation()
  const { currentTenant, session } = useAuth()
  const tenantId = currentTenant?.tenant.id
  const canWrite = currentTenant ? WRITE_ROLES.includes(currentTenant.role) : false

  const warehouses = useWarehouses(tenantId)

  const [warehouseId, setWarehouseId] = useState('')
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const [opOpen, setOpOpen] = useState(false)
  const [kind, setKind] = useState<OpKind>('receipt')
  const [variant, setVariant] = useState<VariantOption | null>(null)
  const [qty, setQty] = useState('')
  const [docRef, setDocRef] = useState('')
  const [note, setNote] = useState('')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(input)
      setPage(0)
    }, 350)
    return () => clearTimeout(id)
  }, [input])

  const stock = useStockReport(tenantId, { warehouseId, search, page })
  const move = useStockMove(tenantId, session?.user.id)
  const transfer = useTransferStock(tenantId)

  const list = warehouses.data ?? []
  const total = stock.data?.total ?? 0
  const lastPage = Math.max(0, Math.ceil(total / STOCK_PAGE_SIZE) - 1)

  const busy = move.isPending || transfer.isPending
  const opError = move.error ?? transfer.error

  function resetOp() {
    setVariant(null)
    setQty('')
    setDocRef('')
    setNote('')
  }

  function submitOp(e: FormEvent) {
    e.preventDefault()
    if (!variant) return

    if (kind === 'transfer') {
      if (!fromId || !toId) return
      transfer.mutate({ variantId: variant.id, fromId, toId, qty, note }, { onSuccess: resetOp })
      return
    }

    const target = warehouseId || list.find((w) => w.is_default)?.id || list[0]?.id
    if (!target) return

    const reason: SimpleReason =
      kind === 'receipt' ? 'receipt' : kind === 'writeoff' ? 'writeoff' : 'correction'

    move.mutate(
      { warehouseId: target, variantId: variant.id, qty, reason, docRef, note },
      { onSuccess: resetOp },
    )
  }

  if (warehouses.isPending) return <LoadingState rows={5} />

  if (warehouses.isError) {
    return <ErrorState onRetry={() => void warehouses.refetch()} />
  }

  // Без склада принимать товар некуда. Это не пустой список, а недостающая настройка.
  if (list.length === 0) {
    return (
      <EmptyState
        title={t('wms.needWarehouse')}
        body={t('wms.needWarehouseBody')}
        action={
          canWrite ? (
            <Link to="/warehouse/settings">
              <Button size="sm">{t('wms.addWarehouse')}</Button>
            </Link>
          ) : undefined
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t('nav.warehouse')}</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/warehouse/journal">
            <Button variant="secondary">{t('wms.journal')}</Button>
          </Link>
          <Link to="/warehouse/settings">
            <Button variant="secondary">{t('wms.warehouses')}</Button>
          </Link>
          {canWrite ? (
            <Button onClick={() => setOpOpen((v) => !v)}>{t('wms.newOperation')}</Button>
          ) : null}
        </div>
      </div>

      {opOpen && canWrite ? (
        <form
          onSubmit={submitOp}
          className="flex max-w-2xl flex-col gap-4 rounded-lg border border-line bg-surface p-6"
        >
          <Select
            label={t('wms.operation')}
            value={kind}
            onChange={(e) => setKind(e.target.value as OpKind)}
          >
            <option value="receipt">{t('wms.receipt')}</option>
            <option value="writeoff">{t('wms.writeoff')}</option>
            <option value="transfer">{t('wms.transfer')}</option>
            <option value="correction">{t('wms.correction')}</option>
          </Select>

          <VariantPicker tenantId={tenantId} chosen={variant} onChoose={setVariant} />

          {kind === 'transfer' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label={t('wms.from')}
                required
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
              >
                <option value="">{t('catalog.notChosen')}</option>
                {list.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
              <Select
                label={t('wms.to')}
                required
                value={toId}
                onChange={(e) => setToId(e.target.value)}
              >
                <option value="">{t('catalog.notChosen')}</option>
                {list.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <Select
              label={t('wms.warehouse')}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              {list.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('wms.qty')}
              type="number"
              min={0}
              step="0.001"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            {kind !== 'transfer' ? (
              <Field
                label={t('wms.document')}
                hint={t('wms.documentHint')}
                maxLength={128}
                value={docRef}
                onChange={(e) => setDocRef(e.target.value)}
              />
            ) : null}
          </div>

          <Field
            label={t('wms.note')}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {opError ? (
            <p className="text-small text-danger">
              {opError instanceof Error ? opError.message : t('states.errorTitle')}
            </p>
          ) : null}

          <p className="text-small text-ink-muted">{t('wms.appendOnlyNote')}</p>

          <div className="flex gap-2">
            <Button type="submit" disabled={busy || !variant}>
              {t('wms.apply')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpOpen(false)}>
              {t('catalog.cancel')}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('wms.searchPlaceholder')}
          aria-label={t('catalog.search')}
          className="min-w-56 flex-1 rounded-md border border-line-strong bg-surface px-3 py-2 text-ink placeholder:text-ink-faint hover:border-ink-faint focus:border-accent"
        />
        <select
          value={warehouseId}
          onChange={(e) => {
            setWarehouseId(e.target.value)
            setPage(0)
          }}
          aria-label={t('wms.warehouse')}
          className="rounded-md border border-line-strong bg-surface px-3 py-2 text-ink hover:border-ink-faint focus:border-accent"
        >
          <option value="">{t('wms.allWarehouses')}</option>
          {list.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {stock.isPending ? (
        <LoadingState rows={6} />
      ) : stock.isError ? (
        <ErrorState
          body={stock.error instanceof Error ? stock.error.message : undefined}
          onRetry={() => void stock.refetch()}
        />
      ) : stock.data.rows.length === 0 ? (
        <EmptyState title={t('wms.emptyStock')} body={t('wms.emptyStockBody')} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full border-collapse text-small">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-line-strong bg-surface px-3 py-2 text-left font-display text-micro font-bold uppercase tracking-wider text-ink-faint"
                  >
                    {t('wms.product')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-line-strong bg-surface px-3 py-2 text-left font-display text-micro font-bold uppercase tracking-wider text-ink-faint"
                  >
                    {t('catalog.sku')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-line-strong bg-surface px-3 py-2 text-left font-display text-micro font-bold uppercase tracking-wider text-ink-faint"
                  >
                    {t('wms.warehouse')}
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-line-strong bg-surface px-3 py-2 text-right font-display text-micro font-bold uppercase tracking-wider text-ink-faint"
                  >
                    {t('wms.qty')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stock.data.rows.map((r) => (
                  <tr key={`${r.variant_id}-${r.warehouse_id}`} className="hover:bg-surface-hover">
                    <td className="border-b border-line px-3 py-2.5">
                      <Link to={`/catalog/${r.product_id}`} className="text-accent hover:underline">
                        {r.product_name}
                      </Link>
                    </td>
                    <td className="border-b border-line px-3 py-2.5 text-ink-muted">
                      <code className="text-small">{r.sku}</code>
                    </td>
                    <td className="border-b border-line px-3 py-2.5 text-ink-muted">
                      {r.warehouse_name}
                    </td>
                    <td
                      className={`border-b border-line px-3 py-2.5 text-right ${
                        r.qty < 0 ? 'font-bold text-danger' : 'text-ink'
                      }`}
                      title={r.qty < 0 ? t('wms.negativeStock') : undefined}
                    >
                      {formatQty(r.qty, i18n.language)}
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
