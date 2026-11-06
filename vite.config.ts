import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['wrlc-logo-7.png', 'apple-touch-icon.png'],
    manifest: {
      name: 'WRLC Expense Report',
      short_name: 'WRLC Expenses',
      description: 'Complete and download WRLC expense reports by trip.',
      theme_color: '#263fa8',
      background_color: '#f4f6f8',
      display: 'standalone',
      start_url: './',
      scope: './',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
  })],
  base: process.env.GITHUB_ACTIONS ? '/expense-report/' : '/',
  test: { environment: 'jsdom', setupFiles: './src/testSetup.ts', include: ['src/**/*.{test,spec}.{ts,tsx}'] },
});
