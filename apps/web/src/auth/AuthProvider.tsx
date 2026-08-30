import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { MemberRole, Tenant } from '../types/database'

export type TenantMembership = { tenant: Tenant; role: MemberRole }

type AuthValue = {
  session: Session | null
  loading: boolean
  memberships: TenantMembership[]
  currentTenant: TenantMembership | null
  setCurrentTenantId: (id: string) => void
  reloadMemberships: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

const TENANT_KEY = 'sellerhub.tenant'

function readStoredTenant(): string | null {
  try {
    return localStorage.getItem(TENANT_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [memberships, setMemberships] = useState<TenantMembership[]>([])
  const [tenantId, setTenantId] = useState<string | null>(readStoredTenant)

  async function loadMemberships() {
    // RLS сам отдаст только те компании, где пользователь состоит.
    // Фильтровать по user_id во фронте не нужно и не следует:
    // это создало бы ложное ощущение, что защита живёт в клиенте.
    const { data, error } = await supabase
      .from('memberships')
      .select('role, tenants(id, name, slug, locale, created_at, updated_at)')
      .eq('status', 'active')

    if (error) {
      setMemberships([])
      return
    }

    const rows = (data ?? []) as unknown as Array<{ role: MemberRole; tenants: Tenant | null }>
    setMemberships(rows.filter((r) => r.tenants).map((r) => ({ role: r.role, tenant: r.tenants as Tenant })))
  }

  useEffect(() => {
    let cancelled = false

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session) void loadMemberships()
    else setMemberships([])
  }, [session])

  function setCurrentTenantId(id: string) {
    setTenantId(id)
    try {
      localStorage.setItem(TENANT_KEY, id)
    } catch {
      // не запомнили выбор — переживём, в этой сессии он всё равно применён
    }
  }

  const currentTenant = useMemo(() => {
    if (memberships.length === 0) return null
    return memberships.find((m) => m.tenant.id === tenantId) ?? memberships[0]
  }, [memberships, tenantId])

  const value: AuthValue = {
    session,
    loading,
    memberships,
    currentTenant,
    setCurrentTenantId,
    reloadMemberships: loadMemberships,
    signOut: async () => {
      await supabase.auth.signOut()
      setMemberships([])
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth вызван вне AuthProvider')
  return ctx
}
