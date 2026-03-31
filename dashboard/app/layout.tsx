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
});

export const metadata: Metadata = {
  title: 'Covr Penetration Dashboard',
  description: 'Business Intelligence Dashboard for Covr Leadership',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${heptaSlab.variable} ${nunitoSans.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
