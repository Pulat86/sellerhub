import type { Dictionary } from './ru'

export const uz: Dictionary = {
  app: { name: 'SellerHub' },
  nav: {
    dashboard: 'Boshqaruv paneli',
    catalog: 'Katalog',
    orders: 'Buyurtmalar',
    warehouse: 'Ombor',
    analytics: 'Tahlil',
    settings: 'Sozlamalar',
  },
  auth: {
    signInTitle: 'SellerHub tizimiga kirish',
    signUpTitle: 'Ro‘yxatdan o‘tish',
    email: 'Elektron pochta',
    password: 'Parol',
    signIn: 'Kirish',
    signUp: 'Hisob yaratish',
    toSignUp: 'Hisobingiz yo‘qmi? Ro‘yxatdan o‘ting',
    toSignIn: 'Hisobingiz bormi? Kiring',
    signOut: 'Chiqish',
    checkEmail: 'Pochtangizni tekshiring — tasdiqlash xati yubordik.',
  },
  tenant: {
    createTitle: 'Kompaniya yarating',
    createLede: 'Kompaniya — bu sizning mahsulotlaringiz, omborlaringiz va buyurtmalaringiz. Bir kompaniya ma’lumotlari boshqasiga ko‘rinmaydi.',
    name: 'Kompaniya nomi',
    slug: 'Qisqa manzil',
    slugHint: 'Lotin harflari, raqamlar va chiziqcha. Masalan: ziyod',
    create: 'Kompaniya yaratish',
    switch: 'Kompaniya',
  },
  states: {
    loading: 'Yuklanmoqda…',
    emptyTitle: 'Bu yerda hozircha bo‘sh',
    errorTitle: 'Yuklab bo‘lmadi',
    retry: 'Qayta urinish',
    noAccessTitle: 'Bo‘lim sizning rolingiz uchun yopiq',
    noAccessBody: 'Kompaniya egasidan rolingizni o‘zgartirishni so‘rang.',
  },
  soon: {
    title: 'Bo‘lim ishlanmoqda',
    body: 'Keyingi bosqichlarda paydo bo‘ladi. Hozir poydevor qurilgan: kompaniyalar, rollar va sinxronizatsiya navbati.',
  },
}
