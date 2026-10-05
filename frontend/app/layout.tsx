import { siteConfig } from '@/lib/siteConfig';
import Script from 'next/script';
import './globals.css';
import type { Metadata } from 'next';
import { Header } from './components/Header';

export const metadata: Metadata = {
  title: siteConfig.title,
  description: 'Find remote jobs from multiple sources in one place',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
  other: {
    monetag: '0908b5ea306b7883ab2495e56bf470b7',
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
        {/* Bootstrap CDN for CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
          integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Header />
        {/* Using Bootstrap container for responsive layout */}
        <div className="container py-4">
          {children}
        </div>
        
        {/* Histats tracking - inline initialization before script load */}
        <Script
          id="histats-init"
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
        
        {/* Histats loader script */}
        <Script
          id="histats-loader"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var hs = document.createElement('script');
  hs.type = 'text/javascript';
  hs.async = true;
  hs.src = ('//s10.histats.com/js15_as.js');
  (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
})();
            `
          }}
        />
        
        {/* Third-party monetization script - loaded after interactive */}
        <Script
          src="https://pl31517511.profitableratecpmnetwork.com/0a/6f/45/0a6f45f6cd118b7b19498f9076f1a08f.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}