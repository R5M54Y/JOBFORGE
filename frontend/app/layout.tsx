import { siteConfig } from '@/lib/siteConfig';
import Script from 'next/script';
import './globals.css'; // This now imports Bootstrap CSS
import type { Metadata } from 'next';
import { Header } from './components/Header';

// Bootstrap JS (optional, for interactive components if needed, otherwise CSS is sufficient)
// For simplicity, we'll rely on CSS for layout and styling, not JS initially.
// If JS components like dropdowns or modals are needed later, uncomment and add:
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';

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
        {/* Bootstrap CDN for CSS - Consider local import if preferred/possible */}
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
        
        {/* External Scripts - Keep as is, unless deemed problematic */}
        <div
          dangerouslySetInnerHTML={{
            __html: `
<script type="text/javascript">
var _Hasync = _Hasync || [];
_Hasync.push(['Histats.start', '1,5052094,4,511,95,18,00000000']);
_Hasync.push(['Histats.fasi', '1']);
_Hasync.push(['Histats.track_hits', '']);
(function() {
  var hs = document.createElement('script');
  hs.type = 'text/javascript';
  hs.async = true;
  hs.src = ('//s10.histats.com/js15_as.js');
  (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
})();
</script>
<script src="https://pl31517511.profitableratecpmnetwork.com/0a/6f/45/0a6f45f6cd118b7b19498f9076f1a08f.js"></script>
            `
          }}
          style={{ display: 'none' }}
        />
      </body>
    </html>
  );
}