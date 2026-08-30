import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { AppLayout } from './components/AppLayout'
import { SignIn } from './routes/SignIn'
import { CreateTenant } from './routes/CreateTenant'
import { Placeholder } from './routes/Placeholder'
import { LoadingState } from './components/ui/States'

export function App() {
  const { session, loading, memberships } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-full place-items-center p-6">
        <div className="w-full max-w-sm">
          <LoadingState />
        </div>
      </div>
    )
  }

  if (!session) return <SignIn />

  // Вошёл, но компании ещё нет — сначала создаём её.
  if (memberships.length === 0) return <CreateTenant />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Placeholder titleKey="nav.dashboard" />} />
        <Route path="catalog" element={<Placeholder titleKey="nav.catalog" />} />
        <Route path="orders" element={<Placeholder titleKey="nav.orders" />} />
        <Route path="warehouse" element={<Placeholder titleKey="nav.warehouse" />} />
        <Route path="analytics" element={<Placeholder titleKey="nav.analytics" />} />
        <Route path="settings" element={<Placeholder titleKey="nav.settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
