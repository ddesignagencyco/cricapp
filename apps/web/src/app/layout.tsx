import './globals.css';
import './site-header.css';
import './assistant.css';
import dynamic from 'next/dynamic';
import { Inter, JetBrains_Mono, Noto_Nastaliq_Urdu } from 'next/font/google';
import ScrollToTop from '../components/ScrollToTop';
import JsonLd from './json-ld';
import ThemeProvider from '../components/ThemeProvider';
import AuthProvider from '../components/AuthProvider';
import QueryProvider from '../components/QueryProvider';
import ClientLayout from '../components/ClientLayout';
import Footer from '../components/Footer';
import AdProvider from '../components/advertisements/AdProvider';
import { loadSiteSettings } from '../services/siteSettings';

// Toast runtime (react-hot-toast + goober) is only needed for user actions
// after hydration, so it splits into its own chunk. SSR output is unchanged
// (an empty container either way).
const Toaster = dynamic(() =>
  import('react-hot-toast').then((module) => module.Toaster),
);

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic', 'latin'],
  variable: '--font-urdu',
  display: 'swap',
  // Only Urdu-script pages need this 240 KiB family. Without `preload: false`
  // next/font injects a preload for every subset on every page; with it the
  // browser fetches the webfont on demand (unicode-range) when Urdu glyphs
  // actually render, and Latin-only pages download nothing.
  preload: false,
});

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadSiteSettings();
  // The API origin serves scores/news and the live socket. Preconnecting saves
  // ~150ms on the first API round-trip (Lighthouse `uses-rel-preconnect`).
  let apiOrigin: string | null = null;
  try {
    const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
    apiOrigin = raw ? new URL(raw).origin : null;
  } catch {
    apiOrigin = null;
  }
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} ${nastaliq.variable}`}>
      <head>
        {apiOrigin ? <link rel="preconnect" href={apiOrigin} /> : null}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pak-criczone-theme')||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.classList.toggle('light',t==='light');document.documentElement.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-primary text-mtext font-sans antialiased" suppressHydrationWarning>
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
            <QueryProvider>
              <AdProvider config={settings.ads}>
                <ClientLayout footer={<Footer settings={settings} />}>{children}</ClientLayout>
              </AdProvider>
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
                    iconTheme: { primary: 'var(--color-brand)', secondary: 'var(--color-surface-elevated)' },
                  },
                  error: {
                    className: 'pcz-toast pcz-toast--error',
                    iconTheme: { primary: 'var(--color-danger)', secondary: 'var(--color-surface-elevated)' },
                  },
                }}
              />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
