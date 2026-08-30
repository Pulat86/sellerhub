import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'

export function SignIn() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    const result =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (result.error) setError(result.error.message)
    else if (mode === 'up' && !result.data.session) setNotice(t('auth.checkEmail'))

    setBusy(false)
  }

  return (
    <div className="grid min-h-full place-items-center p-6">
      <form
        onSubmit={(e) => void submit(e)}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-line bg-surface p-6 shadow-sm"
      >
        <h1 className="font-display text-xl font-bold tracking-tight">
          {mode === 'in' ? t('auth.signInTitle') : t('auth.signUpTitle')}
        </h1>

        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={t('auth.password')}
          type="password"
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
        />

        {notice && <p className="text-small text-ok">{notice}</p>}

        <Button type="submit" disabled={busy}>
          {mode === 'in' ? t('auth.signIn') : t('auth.signUp')}
        </Button>

        <button
          type="button"
          className="text-small text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in')
            setError(null)
            setNotice(null)
          }}
        >
          {mode === 'in' ? t('auth.toSignUp') : t('auth.toSignIn')}
        </button>
      </form>
    </div>
  )
}
