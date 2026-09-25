import type { Metadata } from 'next';
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
      <body>{children}</body>
    </html>
  );
}
