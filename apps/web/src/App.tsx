import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { AppLayout } from './components/AppLayout'
import { SignIn } from './routes/SignIn'
import { CreateTenant } from './routes/CreateTenant'
import { Placeholder } from './routes/Placeholder'
import { Catalog } from './routes/Catalog'
import { ProductNew } from './routes/ProductNew'
import { ProductDetail } from './routes/ProductDetail'
import { CatalogReferences } from './routes/CatalogReferences'
import { ErrorState, LoadingState } from './components/ui/States'

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

export function App() {
  const { session, loading, memberships, membershipsError, membershipsLoading, reloadMemberships } = useAuth()

  if (loading) {
    return (
      <Centered>
        <LoadingState />
      </Centered>
    )
  }

  if (!session) return <SignIn />

  if (membershipsLoading) {
    return (
      <Centered>
        <LoadingState />
      </Centered>
    )
  }

  // Ошибка загрузки — ЭТО НЕ «компаний нет».
  // Без этой ветки сетевой сбой вёл бы на экран создания компании
  // и пользователь завёл бы дубль своей же компании.
  if (membershipsError) {
    return (
      <Centered>
        <ErrorState body={membershipsError} onRetry={() => void reloadMemberships()} />
      </Centered>
    )
  }

  if (memberships.length === 0) return <CreateTenant />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Placeholder titleKey="nav.dashboard" />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="catalog/new" element={<ProductNew />} />
        <Route path="catalog/references" element={<CatalogReferences />} />
        {/* Конкретные пути объявлены выше параметрического:
            иначе /catalog/new ушёл бы в карточку с id = "new". */}
        <Route path="catalog/:id" element={<ProductDetail />} />
        <Route path="orders" element={<Placeholder titleKey="nav.orders" />} />
        <Route path="warehouse" element={<Placeholder titleKey="nav.warehouse" />} />
        <Route path="analytics" element={<Placeholder titleKey="nav.analytics" />} />
        <Route path="settings" element={<Placeholder titleKey="nav.settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
