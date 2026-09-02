import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Select } from '../components/ui/Select'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States'
import {
  formatMoney,
  useArchiveProduct,
  useBrands,
  useCategories,
  useCreateVariant,
  useDeleteVariant,
  useProduct,
  useUpdateProduct,
  useUpdateVariant,
  useVariants,
  type NewVariant,
  type VariantRow,
} from '../lib/catalog'
import type { Enums } from '../types/database'

const WRITE_ROLES = ['owner', 'admin', 'manager']
const DELETE_ROLES = ['owner', 'admin']
const CURRENCIES: Array<Enums<'currency'>> = ['UZS', 'USD', 'RUB', 'KZT', 'EUR']

const EMPTY_VARIANT: NewVariant = {
  sku: '',
  barcode: '',
  name: '',
  costPrice: '',
  currency: 'UZS',
}

/** Слой данных бросает код, а не готовую фразу — он не знает языка интерфейса. */
function useErrorText() {
  const { t } = useTranslation()
  return (e: unknown): string => {
    if (!(e instanceof Error)) return t('states.errorTitle')
    if (e.message === 'sku_taken') return t('product.skuTaken')
    return e.message
  }
}

/** Строка варианта: просмотр или редактирование на месте. */
function VariantItem({
  v,
  locale,
  canWrite,
  canDelete,
  onlyOne,
  tenantId,
}: {
  v: VariantRow
  locale: string
  canWrite: boolean
  canDelete: boolean
  onlyOne: boolean
  tenantId: string | undefined
}) {
  const { t } = useTranslation()
  const errorText = useErrorText()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<NewVariant>(EMPTY_VARIANT)

  const update = useUpdateVariant(tenantId)
  const remove = useDeleteVariant(tenantId)

  function startEdit() {
    setForm({
      sku: v.sku,
      barcode: v.barcode ?? '',
      name: v.name ?? '',
      costPrice: v.cost_price === null ? '' : String(v.cost_price),
      currency: v.cost_currency,
    })
    setEditing(true)
  }

  function save(e: FormEvent) {
    e.preventDefault()
    update.mutate({ id: v.id, ...form }, { onSuccess: () => setEditing(false) })
  }

  if (editing) {
    return (
      <li className="border-b border-line py-3 last:border-0">
        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t('catalog.sku')}
              required
              maxLength={64}
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
            <Field
              label={t('catalog.barcode')}
              maxLength={64}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </div>
          <Field
            label={t('product.variantLabel')}
            hint={t('product.variantLabelHint')}
            maxLength={300}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t('catalog.cost')}
              type="number"
              min={0}
              step="0.01"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            />
            <Select
              label={t('catalog.currency')}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value as Enums<'currency'> })}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          {update.isError ? (
            <p className="text-small text-danger">{errorText(update.error)}</p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={update.isPending}>
              {t('catalog.save')}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
              {t('catalog.cancel')}
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 last:border-0">
      <div className="flex flex-col">
        <code className="text-small text-ink">{v.sku}</code>
        <span className="text-mini text-ink-faint">
          {v.name ? `${v.name} \u00b7 ` : ''}
          {v.barcode ?? t('product.noBarcode')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-small text-ink-muted">
          {formatMoney(v.cost_price, v.cost_currency, locale)}
        </span>
        {canWrite ? (
          <Button size="sm" variant="secondary" onClick={startEdit}>
            {t('product.edit')}
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            variant="danger"
            // Последний вариант удалить нельзя: товар остался бы без артикула.
            // Кнопка гаснет заранее, но запрет держит триггер в базе.
            disabled={onlyOne || remove.isPending}
            title={onlyOne ? t('product.lastVariantHint') : undefined}
            onClick={() => {
              if (window.confirm(t('product.confirmDeleteVariant', { sku: v.sku }))) {
                remove.mutate(v.id)
              }
            }}
          >
            {t('refs.delete')}
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export function ProductDetail() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTenant } = useAuth()
  const tenantId = currentTenant?.tenant.id
  const errorText = useErrorText()

  const canWrite = currentTenant ? WRITE_ROLES.includes(currentTenant.role) : false
  const canDelete = currentTenant ? DELETE_ROLES.includes(currentTenant.role) : false

  const product = useProduct(tenantId, id)
  const variants = useVariants(tenantId, id)
  const categories = useCategories(tenantId)
  const brands = useBrands(tenantId)

  const updateProduct = useUpdateProduct(tenantId, id)
  const archiveProduct = useArchiveProduct(tenantId)
  const createVariant = useCreateVariant(tenantId, id)

  const [form, setForm] = useState({ name: '', description: '', categoryId: '', brandId: '' })
  const [newVariant, setNewVariant] = useState<NewVariant>(EMPTY_VARIANT)
  const [addingVariant, setAddingVariant] = useState(false)

  // Форма заполняется, когда товар загрузился. Отдельное состояние нужно,
  // чтобы правки не терялись при фоновом обновлении запроса.
  useEffect(() => {
    if (!product.data) return
    setForm({
      name: product.data.name,
      description: product.data.description ?? '',
      categoryId: product.data.category_id ?? '',
      brandId: product.data.brand_id ?? '',
    })
  }, [product.data])

  if (product.isPending) return <LoadingState rows={6} />

  if (product.isError) {
    return (
      <ErrorState
        body={product.error instanceof Error ? product.error.message : undefined}
        onRetry={() => void product.refetch()}
      />
    )
  }

  // Пустой ответ — это не сбой, а чужой или архивный товар.
  if (!product.data) {
    return (
      <EmptyState
        title={t('product.notFound')}
        body={t('product.notFoundBody')}
        action={
          <Link to="/catalog">
            <Button size="sm">{t('refs.backToCatalog')}</Button>
          </Link>
        }
      />
    )
  }

  const archived = Boolean(product.data.archived_at)
  const variantCount = variants.data?.length ?? 0

  function saveProduct(e: FormEvent) {
    e.preventDefault()
    updateProduct.mutate(form)
  }

  function addVariant(e: FormEvent) {
    e.preventDefault()
    createVariant.mutate(newVariant, {
      onSuccess: () => {
        setNewVariant(EMPTY_VARIANT)
        setAddingVariant(false)
      },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{product.data.name}</h1>
        <div className="flex gap-2">
          <Link to="/catalog">
            <Button variant="secondary" size="sm">
              {t('refs.backToCatalog')}
            </Button>
          </Link>
          {canDelete && !archived ? (
            <Button
              variant="danger"
              size="sm"
              disabled={archiveProduct.isPending}
              onClick={() => {
                if (window.confirm(t('product.confirmArchive', { name: product.data!.name }))) {
                  archiveProduct.mutate(product.data!.id, {
                    onSuccess: () => navigate('/catalog'),
                  })
                }
              }}
            >
              {t('product.archive')}
            </Button>
          ) : null}
        </div>
      </div>

      {archived ? (
        <p className="rounded-md border border-line bg-surface-sunken px-4 py-3 text-small text-ink-muted">
          {t('product.archivedNotice')}
        </p>
      ) : null}

      {/* ОСНОВНОЕ */}
      <form
        onSubmit={saveProduct}
        className="flex max-w-2xl flex-col gap-4 rounded-lg border border-line bg-surface p-6"
      >
        <Field
          label={t('catalog.name')}
          required
          maxLength={500}
          disabled={!canWrite}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="product-description"
            className="font-display text-micro font-bold uppercase tracking-wider text-ink-faint"
          >
            {t('product.description')}
          </label>
          <textarea
            id="product-description"
            rows={4}
            maxLength={20000}
            disabled={!canWrite}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-ink hover:border-ink-faint focus:border-accent disabled:opacity-60"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('catalog.category')}
            disabled={!canWrite}
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">{t('catalog.notChosen')}</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label={t('catalog.brand')}
            disabled={!canWrite}
            value={form.brandId}
            onChange={(e) => setForm({ ...form, brandId: e.target.value })}
          >
            <option value="">{t('catalog.notChosen')}</option>
            {(brands.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        {updateProduct.isError ? (
          <p className="text-small text-danger">{errorText(updateProduct.error)}</p>
        ) : null}
        {updateProduct.isSuccess ? (
          <p className="text-small text-ink-muted">{t('product.saved')}</p>
        ) : null}

        {canWrite ? (
          <div>
            <Button type="submit" disabled={updateProduct.isPending}>
              {t('catalog.save')}
            </Button>
          </div>
        ) : null}
      </form>

      {/* ВАРИАНТЫ */}
      <section className="flex max-w-2xl flex-col gap-3 rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lead font-bold">{t('product.variants')}</h2>
          {canWrite && !addingVariant ? (
            <Button size="sm" variant="secondary" onClick={() => setAddingVariant(true)}>
              {t('product.addVariant')}
            </Button>
          ) : null}
        </div>

        {variants.isPending ? (
          <LoadingState rows={2} />
        ) : variants.isError ? (
          <ErrorState onRetry={() => void variants.refetch()} />
        ) : (
          <ul className="flex flex-col">
            {(variants.data ?? []).map((v) => (
              <VariantItem
                key={v.id}
                v={v}
                locale={i18n.language}
                canWrite={canWrite}
                canDelete={canDelete}
                onlyOne={variantCount <= 1}
                tenantId={tenantId}
              />
            ))}
          </ul>
        )}

        {addingVariant ? (
          <form onSubmit={addVariant} className="flex flex-col gap-3 border-t border-line pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t('catalog.sku')}
                hint={t('catalog.skuHint')}
                required
                maxLength={64}
                value={newVariant.sku}
                onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
              />
              <Field
                label={t('catalog.barcode')}
                maxLength={64}
                value={newVariant.barcode}
                onChange={(e) => setNewVariant({ ...newVariant, barcode: e.target.value })}
              />
            </div>

            <Field
              label={t('product.variantLabel')}
              hint={t('product.variantLabelHint')}
              maxLength={300}
              value={newVariant.name}
              onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t('catalog.cost')}
                type="number"
                min={0}
                step="0.01"
                value={newVariant.costPrice}
                onChange={(e) => setNewVariant({ ...newVariant, costPrice: e.target.value })}
              />
              <Select
                label={t('catalog.currency')}
                value={newVariant.currency}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, currency: e.target.value as Enums<'currency'> })
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            {createVariant.isError ? (
              <p className="text-small text-danger">{errorText(createVariant.error)}</p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={createVariant.isPending}>
                {t('product.addVariant')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setAddingVariant(false)}
              >
                {t('catalog.cancel')}
              </Button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  )
}
