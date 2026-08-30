import type { Dictionary } from './ru'

export const en: Dictionary = {
  app: { name: 'SellerHub' },
  nav: {
    dashboard: 'Dashboard',
    catalog: 'Catalog',
    orders: 'Orders',
    warehouse: 'Warehouse',
    analytics: 'Analytics',
    settings: 'Settings',
  },
  auth: {
    signInTitle: 'Sign in to SellerHub',
    signUpTitle: 'Create an account',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    toSignUp: 'No account yet? Sign up',
    toSignIn: 'Already have an account? Sign in',
    signOut: 'Sign out',
    checkEmail: 'Check your email — we sent a confirmation link.',
  },
  tenant: {
    createTitle: 'Create a company',
    createLede: 'A company holds your products, warehouses and orders. One company never sees another one’s data.',
    name: 'Company name',
    slug: 'Short address',
    slugHint: 'Latin letters, digits and hyphens. For example: ziyod',
    create: 'Create company',
    switch: 'Company',
  },
  states: {
    loading: 'Loading…',
    emptyTitle: 'Nothing here yet',
    errorTitle: 'Could not load',
    retry: 'Try again',
    noAccessTitle: 'Closed for your role',
    noAccessBody: 'Ask the company owner to change your role.',
  },
  soon: {
    title: 'Section in progress',
    body: 'Coming in the next stages. The foundation is in place: companies, roles and the sync queue.',
  },
}
