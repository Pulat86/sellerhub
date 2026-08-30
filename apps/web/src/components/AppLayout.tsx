import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'
import { useAuth } from '../auth/AuthProvider'

export function AppLayout() {
  const { t } = useTranslation()
  const { currentTenant } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-full">
      {/* Постоянное меню начиная с планшета */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* На телефоне — выдвижная панель. Приёмка и сканирование идут с телефона. */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label={t('nav.closeMenu')}
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-lg">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <button
            className="rounded-md border border-line-strong px-2 py-1 text-ink-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={t('nav.openMenu')}
          >
            ☰
          </button>
          <span className="font-display text-small font-semibold text-ink">
            {currentTenant?.tenant.name ?? t('app.name')}
          </span>
          {currentTenant && (
            <span className="rounded-sm bg-surface-sunken px-2 py-0.5 font-display text-micro font-bold text-ink-muted">
              {currentTenant.role}
            </span>
          )}
        </header>

        <main className="min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
