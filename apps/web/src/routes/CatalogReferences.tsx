import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Select } from '../components/ui/Select'
import { EmptyState, ErrorState, LoadingState, NoAccessState } from '../components/ui/States'
import {
  useBrands,
  useCategories,
  useCreateBrand,
  useCreateCategory,
  useDeleteBrand,
  useDeleteCategory,
} from '../lib/catalog'

const WRITE_ROLES = ['owner', 'admin', 'manager']
const DELETE_ROLES = ['owner', 'admin']

/** Сообщение об ошибке через словарь: слой данных не знает языка интерфейса
 *  и бросает код, а не готовую фразу. */
function useErrorText() {
  const { t } = useTranslation()
  return (e: unknown): string => {
    if (!(e instanceof Error)) return t('states.errorTitle')
    if (e.message === 'slug_exhausted') return t('refs.slugExhausted')
    return e.message
  }
}

export function CatalogReferences() {
  const { t } = useTranslation()
  const { currentTenant } = useAuth()
  const tenantId = currentTenant?.tenant.id
  const errorText = useErrorText()

  const canWrite = currentTenant ? WRITE_ROLES.includes(currentTenant.role) : false
  const canDelete = currentTenant ? DELETE_ROLES.includes(currentTenant.role) : false

  const categories = useCategories(tenantId)
  const brands = useBrands(tenantId)

  const createCategory = useCreateCategory(tenantId)
  const createBrand = useCreateBrand(tenantId)
  const deleteCategory = useDeleteCategory(tenantId)
  const deleteBrand = useDeleteBrand(tenantId)

  const [categoryName, setCategoryName] = useState('')
  const [parentId, setParentId] = useState('')
  const [brandName, setBrandName] = useState('')

  if (currentTenant && !canWrite) return <NoAccessState />

  function submitCategory(e: FormEvent) {
    e.preventDefault()
    if (!categoryName.trim()) return
    createCategory.mutate(
      { name: categoryName, parentId },
      {
        onSuccess: () => {
          setCategoryName('')
          setParentId('')
        },
      },
    )
  }

  function submitBrand(e: FormEvent) {
    e.preventDefault()
    if (!brandName.trim()) return
    createBrand.mutate(brandName, { onSuccess: () => setBrandName('') })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t('refs.title')}</h1>
        <Link to="/catalog">
          <Button variant="secondary" size="sm">
            {t('refs.backToCatalog')}
          </Button>
        </Link>
      </div>

      <p className="max-w-prose text-small text-ink-muted">{t('refs.lede')}</p>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* КАТЕГОРИИ */}
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
          <h2 className="font-display text-lead font-bold">{t('refs.categories')}</h2>

          <form onSubmit={submitCategory} className="flex flex-col gap-3">
            <Field
              label={t('refs.categoryName')}
              maxLength={200}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <Select
              label={t('refs.parent')}
              hint={t('refs.parentHint')}
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">{t('refs.noParent')}</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            {createCategory.isError ? (
              <p className="text-small text-danger">{errorText(createCategory.error)}</p>
            ) : null}

            <div>
              <Button type="submit" size="sm" disabled={createCategory.isPending}>
                {t('refs.add')}
              </Button>
            </div>
          </form>

          {categories.isPending ? (
            <LoadingState rows={3} />
          ) : categories.isError ? (
            <ErrorState onRetry={() => void categories.refetch()} />
          ) : categories.data.length === 0 ? (
            <EmptyState title={t('refs.emptyCategories')} body={t('refs.emptyCategoriesBody')} />
          ) : (
            <ul className="flex flex-col">
              {categories.data.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-0"
                >
                  <span className={c.parent_id ? 'pl-4 text-ink-muted' : 'text-ink'}>{c.name}</span>
                  {canDelete ? (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deleteCategory.isPending}
                      onClick={() => {
                        if (window.confirm(t('refs.confirmDeleteCategory', { name: c.name }))) {
                          deleteCategory.mutate(c.id)
                        }
                      }}
                    >
                      {t('refs.delete')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* БРЕНДЫ */}
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
          <h2 className="font-display text-lead font-bold">{t('refs.brands')}</h2>

          <form onSubmit={submitBrand} className="flex flex-col gap-3">
            <Field
              label={t('refs.brandName')}
              maxLength={200}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />

            {createBrand.isError ? (
              <p className="text-small text-danger">{errorText(createBrand.error)}</p>
            ) : null}

            <div>
              <Button type="submit" size="sm" disabled={createBrand.isPending}>
                {t('refs.add')}
              </Button>
            </div>
          </form>

          {brands.isPending ? (
            <LoadingState rows={3} />
          ) : brands.isError ? (
            <ErrorState onRetry={() => void brands.refetch()} />
          ) : brands.data.length === 0 ? (
            <EmptyState title={t('refs.emptyBrands')} body={t('refs.emptyBrandsBody')} />
          ) : (
            <ul className="flex flex-col">
              {brands.data.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-0"
                >
                  <span>{b.name}</span>
                  {canDelete ? (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={deleteBrand.isPending}
                      onClick={() => {
                        if (window.confirm(t('refs.confirmDeleteBrand', { name: b.name }))) {
                          deleteBrand.mutate(b.id)
                        }
                      }}
                    >
                      {t('refs.delete')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
