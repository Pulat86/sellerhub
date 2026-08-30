export const ru = {
  app: { name: 'SellerHub' },
  nav: {
    dashboard: 'Дашборд',
    catalog: 'Каталог',
    orders: 'Заказы',
    warehouse: 'Склад',
    analytics: 'Аналитика',
    settings: 'Настройки',
    openMenu: 'Открыть меню',
    closeMenu: 'Закрыть меню',
  },
  auth: {
    signInTitle: 'Вход в SellerHub',
    signUpTitle: 'Регистрация',
    email: 'Электронная почта',
    password: 'Пароль',
    signIn: 'Войти',
    signUp: 'Создать аккаунт',
    toSignUp: 'Нет аккаунта? Зарегистрируйтесь',
    toSignIn: 'Уже есть аккаунт? Войдите',
    signOut: 'Выйти',
    checkEmail: 'Проверьте почту — мы отправили письмо для подтверждения.',
  },
  tenant: {
    createTitle: 'Создайте компанию',
    createLede: 'Компания — это ваши товары, склады и заказы. Данные одной компании не видны другой.',
    name: 'Название компании',
    slug: 'Короткий адрес',
    slugHint: 'Латиница, цифры и дефис. Например: ziyod',
    create: 'Создать компанию',
    switch: 'Компания',
  },
  states: {
    loading: 'Загружаем…',
    emptyTitle: 'Здесь пока пусто',
    errorTitle: 'Не удалось загрузить',
    retry: 'Повторить',
    noAccessTitle: 'Раздел закрыт для вашей роли',
    noAccessBody: 'Попросите владельца компании изменить вашу роль.',
  },
  soon: {
    title: 'Раздел в работе',
    body: 'Появится на следующих этапах. Сейчас заложен фундамент: компании, роли и очередь синхронизации.',
  },
}

export type Dictionary = typeof ru
