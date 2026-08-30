import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: установка без App Store и Google Play.
    // Оператор склада ставит иконку на телефон и сканирует штрихкоды.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SellerHub',
        short_name: 'SellerHub',
        description: 'Управление продажами на маркетплейсах',
        lang: 'ru',
        start_url: '/',
        display: 'standalone',
        background_color: '#F5F8F7',
        theme_color: '#0E7C66',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
