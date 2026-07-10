import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { PwaManager } from '@/components/pwa-manager';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sisters Fashion Shop',
  description:
    'Sales, stock, customers, unpaid sales, expenses, and reports for Sisters Fashion Shop.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Sisters Fashion Shop',
  appleWebApp: {
    capable: true,
    title: 'Sisters Fashion',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      {
        url: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    {
      media: '(prefers-color-scheme: light)',
      color: '#F05A9D',
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: '#161616',
    },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <PwaManager />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
