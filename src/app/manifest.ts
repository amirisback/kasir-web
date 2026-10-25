import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AmirPOS - Kasir UMKM Kuliner',
    short_name: 'AmirPOS',
    description: 'Aplikasi Kasir dan POS modern untuk UMKM Kuliner dan Kedai Kopi',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf7f2',
    theme_color: '#d97706',
    icons: [
      {
        src: '/icon-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  }
}
