import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sisters Fashion Shop',
    short_name: 'Sisters Fashion',
    description: 'Mobile-first shop system for boutique sales, stock, customers, and reports.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FAFAFC',
    theme_color: '#F05A9D',
    orientation: 'portrait',
    icons: [
      {
        src: '/window.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/globe.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  };
}
