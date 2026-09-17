import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Genera el manifest y el service worker automáticamente (estrategia
      // generateSW de Workbox) — sin código de registro manual en main.jsx.
      registerType: 'autoUpdate',
      // Favicons/apple-touch-icon: ya enlazados a mano en index.html, pero
      // se incluyen aquí también para que el propio service worker los
      // precachee como parte de los assets estáticos.
      includeAssets: [
        'icons/favicon-16.png',
        'icons/favicon-32.png',
        'icons/favicon-48.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        name: 'NoctUp',
        short_name: 'NoctUp',
        description:
          'App para descubrir dónde sale la gente, ver dónde van tus amigos, locales, eventos y mapa.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#faf9f7',
        theme_color: '#faf9f7',
        lang: 'es',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precachea únicamente los assets del propio build (JS, CSS, HTML,
        // fuentes e imágenes servidos desde este mismo origen). Sin ninguna
        // regla de runtimeCaching: las peticiones a Supabase van a otro
        // origen distinto (*.supabase.co) y el service worker, por diseño,
        // nunca las intercepta ni las cachea — ni sesiones, ni datos
        // personales, ni respuestas de la API.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
