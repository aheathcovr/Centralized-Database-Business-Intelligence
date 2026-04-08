import type { Metadata } from 'next';
import { Hepta_Slab, Nunito_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const heptaSlab = Hepta_Slab({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-hepta-slab',
  display: 'swap',
});

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nunito-sans',
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: {
    default: 'Covr BI Dashboard',
    template: '%s | Covr BI Dashboard',
  },
  description: 'Business Intelligence Dashboard for Covr Leadership',
  keywords: ['Covr', 'BI', 'dashboard', 'RevOps', 'sales', 'analytics'],
  openGraph: {
    title: 'Covr BI Dashboard',
    description: 'Business Intelligence Dashboard for Covr Leadership',
    siteName: 'Covr',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${heptaSlab.variable} ${nunitoSans.variable}`}>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded-lg focus:text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Skip to main content
        </a>
        <Providers>
          <main id="main-content">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
