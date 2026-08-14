import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/codex-time/' : '/',
  plugins: [
    react(),
    VitePWA({
      disable: process.env.VITE_E2E === 'true',
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '时衡 · 柳比歇夫时间管理',
        short_name: '时衡',
        description: '个人时间记录、统计、复盘与计划工具',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4f7fb',
        theme_color: '#315c87',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [{ urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/i, handler: 'NetworkOnly' }]
      }
    })
  ],
  build: { sourcemap: true, target: 'es2022' }
});
