import './globals.css';
import ScrollToTop from '../components/ScrollToTop';
import JsonLd from './json-ld';
import ThemeProvider from '../components/ThemeProvider';
import AuthProvider from '../components/AuthProvider';
import ClientLayout from '../components/ClientLayout';
import { Toaster } from 'react-hot-toast';

export const metadata = {
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
            <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
