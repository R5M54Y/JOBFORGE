import { siteConfig } from '@/lib/siteConfig';
import Script from 'next/script';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: siteConfig.title,
  description: 'Find remote jobs from multiple sources in one place',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Noscript fallback for Histats */}
        <noscript>
          <a href="/" target="_blank">
            <img src="//sstatic1.histats.com/0.gif?5052094&101" alt="" />
          </a>
        </noscript>
      </head>
      <body>
        {children}
        {/* Histats Analytics Bootstrap - Initialize _Hasync queue before loading script */}
        <Script
          id="histats-bootstrap"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var _Hasync = _Hasync || [];
              _Hasync.push(['Histats.start', '1,5052094,4,511,95,18,00000000']);
              _Hasync.push(['Histats.fasi', '1']);
              _Hasync.push(['Histats.track_hits', '']);
            `
          }}
        />
        {/* Histats Analytics Integration - Load tracking script */}
        <Script
          id="histats-tracker"
          strategy="afterInteractive"
          src="//s10.histats.com/js15_as.js"
        />
        {/* External script loaded before closing body */}
        <Script
          src="https://pl31517511.profitableratecpmnetwork.com/0a/6f/45/0a6f45f6cd118b7b19498f9076f1a08f.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
