import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      devOptions: {
        enabled: true,
        type: 'module'
      },
      workbox: {
        // УВЕЛИЧИВАЕМ ЛИМИТ ДО 5 МБ ДЛЯ ИСПРАВЛЕНИЯ ОШИБКИ СБОРКИ
        maximumFileSizeToCacheInBytes: 5000000,

        // Кешируем все статические ресурсы при установке
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],

        // Подключаем наш кастомный обработчик push-уведомлений
        importScripts: ['sw-push.js'],

        // Стратегии кеширования для разных типов запросов
        runtimeCaching: [
          {
            // API запросы — используем NetworkFirst (сеть, а если нет — кеш)
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 часа
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Изображения — CacheFirst (быстро из кеша, обновление в фоне)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Шрифты Google — CacheFirst
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 год
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Kayhon Cargo',
        short_name: 'Kayhon',
        description: 'Kayhon Cargo Logistics Application',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})