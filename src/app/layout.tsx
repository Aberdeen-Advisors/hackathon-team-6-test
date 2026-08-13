import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store/store';

export const metadata: Metadata = {
  title: 'Conductor — Aberdeen Advisors',
  description: 'Transformation roadmap platform. One model, from evidence to Board decision.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Aberdeen brand typography: Poppins — ExtraLight for headings, Medium for
          subheadings, Regular for body. Arial is the sanctioned fallback.
          Loaded via link rather than next/font so the production build does not
          depend on network access at build time.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
