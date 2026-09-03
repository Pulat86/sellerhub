import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { EmptyState, ErrorState, LoadingState, NoAccessState } from '../components/ui/States'
import {
  useArchiveWarehouse,
  useCreateWarehouse,
  useWarehouses,
  type NewWarehouse,
} from '../lib/warehouse'

const WRITE_ROLES = ['owner', 'admin', 'manager']
const DELETE_ROLES = ['owner', 'admin']

const EMPTY: NewWarehouse = { name: '', code: '', address: '', isDefault: false }

export function WarehouseSettings() {
  const { t } = useTranslation()
  const { currentTenant } = useAuth()
  const tenantId = currentTenant?.tenant.id

  const canWrite = currentTenant ? WRITE_ROLES.includes(currentTenant.role) : false
  const canArchive = currentTenant ? DELETE_ROLES.includes(currentTenant.role) : false

  const warehouses = useWarehouses(tenantId)
  const create = useCreateWarehouse(tenantId)
  const archive = useArchiveWarehouse(tenantId)

  const [form, setForm] = useState<NewWarehouse>(EMPTY)

  if (currentTenant && !canWrite) return <NoAccessState />

  function errorText(e: unknown): string {
    if (!(e instanceof Error)) return t('states.errorTitle')
    if (e.message === 'code_taken') return t('wms.codeTaken')
    return e.message
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) return
    create.mutate(form, { onSuccess: () => setForm(EMPTY) })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t('wms.warehouses')}</h1>
        <Link to="/warehouse">
          <Button variant="secondary" size="sm">
            {t('wms.stock')}
          </Button>
        </Link>
      </div>

      <form
        onSubmit={submit}
        className="flex max-w-2xl flex-col gap-4 rounded-lg border border-line bg-surface p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('wms.warehouseName')}
            required
            maxLength={200}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            label={t('wms.code')}
            hint={t('wms.codeHint')}
            required
            maxLength={31}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
        </div>

        <Field
          label={t('wms.address')}
          maxLength={500}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            className="mt-1"
          />
          <span className="flex flex-col">
            <span className="text-ink">{t('wms.isDefault')}</span>
            <span className="text-xs text-ink-muted">{t('wms.isDefaultHint')}</span>
          </span>
        </label>

        {create.isError ? <p className="text-small text-danger">{errorText(create.error)}</p> : null}

        <div>
          <Button type="submit" disabled={create.isPending}>
            {t('wms.addWarehouse')}
          </Button>
        </div>
      </form>

      {warehouses.isPending ? (
        <LoadingState rows={3} />
      ) : warehouses.isError ? (
        <ErrorState onRetry={() => void warehouses.refetch()} />
      ) : warehouses.data.length === 0 ? (
        <EmptyState title={t('wms.emptyWarehouses')} body={t('wms.emptyWarehousesBody')} />
      ) : (
        <ul className="flex max-w-2xl flex-col rounded-lg border border-line bg-surface">
          {warehouses.data.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3 last:border-0"
            >
              <div className="flex flex-col">
                <span className="text-ink">
                  {w.name}
                  {w.is_default ? (
                    <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-mini text-accent">
                      {t('wms.isDefault')}
                    </span>
                  ) : null}
                </span>
                <code className="text-mini text-ink-faint">
                  {w.code}
                  {w.address ? ` \u00b7 ${w.address}` : ''}
                </code>
              </div>

              {canArchive ? (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={archive.isPending}
                  onClick={() => {
                    if (window.confirm(t('wms.confirmArchiveWarehouse', { name: w.name }))) {
                      archive.mutate(w.id)
                    }
                  }}
                >
                  {t('wms.archiveWarehouse')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
