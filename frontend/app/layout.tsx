import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: 'JOBFORGE - Remote Job Aggregator',
  description: 'Find remote jobs from multiple sources in one place',
  ...(googleVerification
    ? {
        verification: {
          google: googleVerification,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Histats Analytics Integration */}
        <Script
          id="histats-tracker"
          strategy="afterInteractive"
          src="//s10.histats.com/js15_as.js"
        />
        {/* Noscript fallback for Histats */}
        <noscript>
          <a href="/" target="_blank">
            <img src="//sstatic1.histats.com/0.gif?5052094&101" alt="" />
          </a>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
