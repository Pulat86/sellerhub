import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Select } from '../components/ui/Select'
import { NoAccessState } from '../components/ui/States'
import { useBrands, useCategories, useCreateProduct, type NewProduct } from '../lib/catalog'
import type { Enums } from '../types/database'

const WRITE_ROLES = ['owner', 'admin', 'manager']
const CURRENCIES: Array<Enums<'currency'>> = ['UZS', 'USD', 'RUB', 'KZT', 'EUR']

export function ProductNew() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentTenant } = useAuth()
  const tenantId = currentTenant?.tenant.id

  const [form, setForm] = useState<NewProduct>({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    brandId: '',
    costPrice: '',
    currency: 'UZS',
  })

  const categories = useCategories(tenantId)
  const brands = useBrands(tenantId)
  const create = useCreateProduct(tenantId)

  // Роль проверяется и здесь, и в базе. Проверка во фронте — вежливость
  // к пользователю, чтобы он не заполнял форму впустую. Защита — в RLS.
  if (currentTenant && !WRITE_ROLES.includes(currentTenant.role)) {
    return <NoAccessState />
  }

  function set<K extends keyof NewProduct>(key: K, value: NewProduct[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate(form, {
      onSuccess: () => navigate('/catalog'),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">{t('catalog.addTitle')}</h1>

      <form
        onSubmit={submit}
        className="flex max-w-2xl flex-col gap-4 rounded-lg border border-line bg-surface p-6"
      >
        <Field
          label={t('catalog.name')}
          required
          maxLength={500}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('catalog.sku')}
            hint={t('catalog.skuHint')}
            required
            maxLength={64}
            value={form.sku}
            onChange={(e) => set('sku', e.target.value)}
          />
          <Field
            label={t('catalog.barcode')}
            hint={t('catalog.barcodeHint')}
            maxLength={64}
            value={form.barcode}
            onChange={(e) => set('barcode', e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('catalog.category')}
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
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
            value={form.brandId}
            onChange={(e) => set('brandId', e.target.value)}
          >
            <option value="">{t('catalog.notChosen')}</option>
            {(brands.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('catalog.cost')}
            hint={t('catalog.costHint')}
            type="number"
            min={0}
            step="0.01"
            value={form.costPrice}
            onChange={(e) => set('costPrice', e.target.value)}
          />
          <Select
            label={t('catalog.currency')}
            value={form.currency}
            onChange={(e) => set('currency', e.target.value as Enums<'currency'>)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {create.isError ? (
          <p className="text-small text-danger">
            {create.error instanceof Error ? create.error.message : t('states.errorTitle')}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={create.isPending}>
            {t('catalog.save')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/catalog')}>
            {t('catalog.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
