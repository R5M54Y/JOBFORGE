import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'JOBFORGE - Remote Job Aggregator',
  description: 'Find remote jobs from multiple sources in one place',
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
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={
            {
              __html: `
                var _Hasync= _Hasync|| [];
                _Hasync.push(['Histats.start', '1,5052094,4,511,95,18,00000000']); 
                _Hasync.push(['Histats.fasi', '1']); 
                _Hasync.push(['Histats.track_hits', '']); 
                (function() {
                  var hs = document.createElement('script'); 
                  hs.type = 'text/javascript'; 
                  hs.async = true; 
                  hs.src = '//s10.histats.com/js15_as.js';
                  var s = document.getElementsByTagName('script')[0]; 
                  s.parentNode.insertBefore(hs, s);
                })();
              `,
            }
          }
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
