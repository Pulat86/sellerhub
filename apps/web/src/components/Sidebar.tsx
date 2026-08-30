import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { LOCALES, setLocale, type Locale } from '../i18n'

const items = [
  { to: '/', key: 'nav.dashboard', end: true },
  { to: '/catalog', key: 'nav.catalog' },
  { to: '/orders', key: 'nav.orders' },
  { to: '/warehouse', key: 'nav.warehouse' },
  { to: '/analytics', key: 'nav.analytics' },
  { to: '/settings', key: 'nav.settings' },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t, i18n } = useTranslation()
  const { memberships, currentTenant, setCurrentTenantId, signOut } = useAuth()

  return (
    <nav className="flex h-full w-60 flex-none flex-col gap-0.5 border-r border-sidebar-line bg-sidebar px-3 py-4">
      <div className="px-3 pb-4 font-display text-[15px] font-extrabold tracking-tight text-sidebar-brand">
        {t('app.name')}
      </div>

      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            'relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors ' +
            (isActive
              ? 'bg-sidebar-active font-semibold text-sidebar-on'
              : 'font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-ink')
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-sm bg-sidebar-mark" />
              )}
              <span className="size-[15px] flex-none rounded-[4px] border-[1.5px] border-current opacity-75" />
              {t(item.key)}
            </>
          )}
        </NavLink>
      ))}

      <div className="mt-auto flex flex-col gap-3 border-t border-sidebar-line pt-4">
        {memberships.length > 1 && (
          <label className="flex flex-col gap-1 px-3">
            <span className="font-display text-[10px] font-bold tracking-wider text-ink-faint uppercase">
              {t('tenant.switch')}
            </span>
            <select
              value={currentTenant?.tenant.id ?? ''}
              onChange={(e) => setCurrentTenantId(e.target.value)}
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
            >
              {memberships.map((m) => (
                <option key={m.tenant.id} value={m.tenant.id}>
                  {m.tenant.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex gap-1 px-3">
          {LOCALES.map((code: Locale) => (
            <button
              key={code}
              onClick={() => setLocale(code)}
              className={
                'rounded-sm px-2 py-1 font-mono text-[11px] uppercase transition-colors ' +
                (i18n.language === code
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-faint hover:bg-sidebar-hover hover:text-ink')
              }
            >
              {code}
            </button>
          ))}
        </div>

        <button
          onClick={() => void signOut()}
          className="mx-3 rounded-md px-3 py-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-sidebar-hover hover:text-ink"
        >
          {t('auth.signOut')}
        </button>
      </div>
    </nav>
  )
}
