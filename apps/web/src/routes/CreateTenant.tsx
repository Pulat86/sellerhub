import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'

export function CreateTenant() {
  const { t } = useTranslation()
  const { reloadMemberships, setCurrentTenantId } = useAuth()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    // Прямой insert в tenants политикой запрещён: компания и её владелец
    // создаются атомарно одной функцией, иначе можно получить компанию без владельца.
    const { data, error: rpcError } = await supabase.rpc('create_tenant', {
      p_name: name,
      p_slug: slug,
    })

    if (rpcError) {
      setError(rpcError.message)
      setBusy(false)
      return
    }

    if (data?.id) setCurrentTenantId(data.id)
    await reloadMemberships()
    setBusy(false)
  }

  return (
    <div className="grid min-h-full place-items-center p-6">
      <form
        onSubmit={(e) => void submit(e)}
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-line bg-surface p-6 shadow-sm"
      >
        <h1 className="font-display text-xl font-bold tracking-tight">{t('tenant.createTitle')}</h1>
        <p className="text-small text-ink-muted">{t('tenant.createLede')}</p>

        <Field
          label={t('tenant.name')}
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (!slug) {
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '')
                  .slice(0, 48),
              )
            }
          }}
        />
        <Field
          label={t('tenant.slug')}
          hint={t('tenant.slugHint')}
          required
          pattern="[a-z0-9][a-z0-9-]{0,46}[a-z0-9]"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          error={error ?? undefined}
        />

        <Button type="submit" disabled={busy}>
          {t('tenant.create')}
        </Button>
      </form>
    </div>
  )
}
