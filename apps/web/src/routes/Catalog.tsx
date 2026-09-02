import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import {
  PAGE_SIZE,
  formatMoney,
  useBrands,
  useCategories,
  useProducts,
  type ProductRow,
} from '../lib/catalog'

/** Роли, которым разрешена запись в каталог. Зеркало app.can_write_catalog в базе.
 *  Это только прячет кнопку — настоящая проверка живёт в RLS. */
const WRITE_ROLES = ['owner', 'admin', 'manager']

function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td className={`border-b border-line px-3 py-2.5 ${muted ? 'text-ink-muted' : 'text-ink'}`}>
      {children}
    </td>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="sticky top-0 z-10 border-b border-line-strong bg-surface px-3 py-2 text-left font-display text-micro font-bold uppercase tracking-wider text-ink-faint"
    >
      {children}
    </th>
  )
}

function Row({ p, locale }: { p: ProductRow; locale: string }) {
  const first = p.product_variants[0]
  const extra = p.product_variants.length - 1

  return (
    <tr className="hover:bg-surface-hover">
      <Cell>
        <span className="font-medium">{p.name}</span>
      </Cell>
      <Cell muted>
        <code className="text-small">{first?.sku ?? '—'}</code>
        {extra > 0 ? <span className="ml-1.5 text-mini text-ink-faint">+{extra}</span> : null}
      </Cell>
      <Cell muted>{p.categories?.name ?? '—'}</Cell>
      <Cell muted>{p.brands?.name ?? '—'}</Cell>
      <Cell muted>
        {first ? formatMoney(first.cost_price, first.cost_currency, locale) : '—'}
      </Cell>
    </tr>
  )
}

export function Catalog() {
  const { t, i18n } = useTranslation()
  const { currentTenant } = useAuth()
  const tenantId = currentTenant?.tenant.id
  const canWrite = currentTenant ? WRITE_ROLES.includes(currentTenant.role) : false

  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [page, setPage] = useState(0)

  // Задержка перед запросом: без неё каждая буква бьёт в базу.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(input)
      setPage(0)
    }, 350)
    return () => clearTimeout(id)
  }, [input])

  const products = useProducts(tenantId, { search, categoryId, brandId, page })
  const categories = useCategories(tenantId)
  const brands = useBrands(tenantId)

  const total = products.data?.total ?? 0
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)
  const filtered = Boolean(search || categoryId || brandId)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t('nav.catalog')}</h1>
        {canWrite ? (
          <Link to="/catalog/new">
            <Button>{t('catalog.add')}</Button>
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('catalog.searchPlaceholder')}
          aria-label={t('catalog.search')}
          className="min-w-56 flex-1 rounded-md border border-line-strong bg-surface px-3 py-2 text-ink placeholder:text-ink-faint hover:border-ink-faint focus:border-accent"
        />

        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setPage(0)
          }}
          aria-label={t('catalog.category')}
          className="rounded-md border border-line-strong bg-surface px-3 py-2 text-ink hover:border-ink-faint focus:border-accent"
        >
          <option value="">{t('catalog.allCategories')}</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value)
            setPage(0)
          }}
          aria-label={t('catalog.brand')}
          className="rounded-md border border-line-strong bg-surface px-3 py-2 text-ink hover:border-ink-faint focus:border-accent"
        >
          <option value="">{t('catalog.allBrands')}</option>
          {(brands.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {products.isPending ? (
        <LoadingState rows={6} />
      ) : products.isError ? (
        <ErrorState
          body={products.error instanceof Error ? products.error.message : undefined}
          onRetry={() => void products.refetch()}
        />
      ) : products.data.rows.length === 0 ? (
        <EmptyState
          title={filtered ? t('catalog.noMatchTitle') : t('catalog.emptyTitle')}
          body={filtered ? t('catalog.noMatchBody') : t('catalog.emptyBody')}
          action={
            !filtered && canWrite ? (
              <Link to="/catalog/new">
                <Button size="sm">{t('catalog.add')}</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full border-collapse text-small">
              <thead>
                <tr>
                  <Head>{t('catalog.name')}</Head>
                  <Head>{t('catalog.sku')}</Head>
                  <Head>{t('catalog.category')}</Head>
                  <Head>{t('catalog.brand')}</Head>
                  <Head>{t('catalog.cost')}</Head>
                </tr>
              </thead>
              <tbody>
                {products.data.rows.map((p) => (
                  <Row key={p.id} p={p} locale={i18n.language} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-small text-ink-muted">
              {t('catalog.total', { count: total })}
            </span>
            {lastPage > 0 ? (
              <div className="flex items-center gap-2">
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
          </div>
        </>
      )}
    </div>
  )
}
