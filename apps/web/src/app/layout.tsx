import './globals.css';
import ScrollToTop from '../components/ScrollToTop';
import JsonLd from './json-ld';
import ThemeProvider from '../components/ThemeProvider';
import AuthProvider from '../components/AuthProvider';
import ClientLayout from '../components/ClientLayout';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  metadataBase: new URL('https://pakcriczone.com'),
  title: {
    default: 'PAK CRICZONE — Cricket Live Scores & PSL Hub',
    template: '%s | PAK CRICZONE',
  },
  description:
    'PAK CRICZONE — Every Run. Every Ball. Live. Pakistan cricket live scores, PSL teams, matches, scoreboards and player statistics.',
  keywords: ['cricket', 'PSL', 'Pakistan Super League', 'live scores', 'PSL 2026', 'cricket scores'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'PAK CRICZONE',
    title: 'PAK CRICZONE — Cricket Live Scores & PSL Hub',
    description: 'Live cricket scores, PSL fixtures, teams, players and statistics.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PAK CRICZONE — Cricket Live Scores & PSL Hub',
    description: 'Live cricket scores, PSL fixtures, teams, players and statistics.',
  },
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  themeColor: '#07111F',
  width: 'device-width' as const,
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pak-criczone-theme')||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.classList.toggle('light',t==='light');}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-primary text-mtext font-sans antialiased">
        <ScrollToTop />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'PAK CRICZONE',
            url: 'https://pakcriczone.com',
            description: 'Cricket live scores, PSL fixtures, teams, players and statistics.',
          }}
        />
        <ThemeProvider>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
            <Toaster
              position="top-right"
              gutter={10}
              containerStyle={{ top: 16, right: 16, zIndex: 80 }}
              toastOptions={{
                duration: 3200,
                className: 'pcz-toast',
                style: {
                  background: 'transparent',
                  color: 'inherit',
                  border: 'none',
                  boxShadow: 'none',
                  padding: 0,
                },
                success: {
                  className: 'pcz-toast pcz-toast--success',
                  iconTheme: { primary: 'var(--color-accent)', secondary: 'var(--color-surface-elevated)' },
                },
                error: {
                  className: 'pcz-toast pcz-toast--error',
                  iconTheme: { primary: 'var(--color-danger)', secondary: 'var(--color-surface-elevated)' },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
