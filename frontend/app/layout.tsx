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
      </head>
      <body>
        {children}
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
        {/* Quge5 - Last element before </body> */}
        <div
          dangerouslySetInnerHTML={{
            __html: `<script src="https://quge5.com/88/tag.min.js" data-zone="287287" async data-cfasync="false"></script>`
          }}
        />
      </body>
    </html>
  );
}
