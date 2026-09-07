import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads VITE_* vars from .env files; also fallback to process.env for Vercel
  const env = loadEnv(mode, process.cwd(), '')
  const rawApiUrl = env.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:5000/api'
  // vite proxy target must be origin without trailing /api
  const proxyTarget = rawApiUrl.replace(/\/api\/?$/, '') || 'http://localhost:5000'

  // Actual frontend URL for PWA association (Vercel production)
  const frontendUrl = 'https://lockandkey-puce.vercel.app'

  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Lock and Key',
        short_name: 'Lock and Key',
        id: '/',
        scope: '/',
        start_url: '/',
        scope_extensions: [{ origin: frontendUrl, type: 'origin' }],
        description: 'Lock and key placement records - associated with ' + frontendUrl,
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        launch_handler: { client_mode: ['navigate-existing', 'auto'] },
        handle_links: 'preferred',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'New Handover',
            short_name: 'Handover',
            description: 'Create new lock & key handover',
            url: '/wizard',
            icons: [{ src: 'favicon.svg', sizes: '192x192', type: 'image/svg+xml' }],
          },
          {
            name: 'History',
            short_name: 'History',
            description: 'View handover history',
            url: '/history',
            icons: [{ src: 'favicon.svg', sizes: '192x192', type: 'image/svg+xml' }],
          },
        ],
        screenshots: [],
      },
      workbox: {
        runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-stylesheets',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // needed for Vercel preview + localhost
    cors: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  }
})
