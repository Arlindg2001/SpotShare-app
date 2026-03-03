import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SpotShare — Find & Rent Parking Spots',
    template: '%s | SpotShare',
  },
  description:
    'Rent out your empty driveway or find affordable parking in your neighborhood. The peer-to-peer parking marketplace for NYC.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SpotShare',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a9166',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
