import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', 'sounds/*.ogg', 'sounds/*.wav', 'sounds/*.mp3'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2,ogg,wav,mp3}'],
      },
      manifest: {
        name: 'MatchGrid',
        short_name: 'MatchGrid',
        description: 'Match-3 puzzle game',
        theme_color: '#0c0b09',
        background_color: '#0c0b09',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
});
