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
        id: '/codex-time/',
        name: '时衡 v2 · 手机时间账本',
        short_name: '时衡',
        description: '基于柳比歇夫方法的手机时间记录与统计工具',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'portrait-primary',
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
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ],
  build: { sourcemap: true, target: 'es2022', chunkSizeWarningLimit: 500 }
});
