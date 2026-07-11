import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules\/(react|react-dom|react-router|scheduler)\//,
            },
            {
              name: 'vendor-query',
              test: /node_modules\/@tanstack\//,
            },
            {
              name: 'vendor-supabase',
              test: /node_modules\/@supabase\//,
            },
            {
              name: 'vendor-motion',
              test: /node_modules\/(motion|framer-motion)\//,
            },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'apple-touch-icon-180x180.png', 'pwa-64x64.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png'],
      manifest: {
        id: 'ganbalog',
        name: 'GanbaLog — Daily Study Schedule',
        short_name: 'GanbaLog',
        description:
          'Belajar ber-target untuk yang susah konsisten — JLPT, TOEIC, IELTS, bisnis, apa pun tujuanmu. Task harian, streak, grup belajar. 継続は力なり.',
        lang: 'en',
        theme_color: '#faf7f2',
        background_color: '#faf7f2',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        related_applications: [
          {
            platform: 'webapp',
            url: '/manifest.webmanifest',
          },
        ],
        prefer_related_applications: false,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        importScripts: ['sw-reminder.js'],
      },
    }),
  ],
})
