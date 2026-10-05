import AdBanner from '../../components/advertisements/AdBanner';
import AdInArticle from '../../components/advertisements/AdInArticle';
import AdMultiplex from '../../components/advertisements/AdMultiplex';
import AdSideRail from '../../components/advertisements/AdSideRail';
import { SimulatedAnchor, SimulatedVignette } from '../../components/advertisements/AdPreviewSimulators';

/**
 * Dummy-mode showcase for every ad format (testing only).
 *
 * - Not linked from any navigation, excluded from the sitemap, `noindex` —
 *   real users and crawlers never land here.
 * - In `house` mode (pre-approval) every section below renders its dummy
 *   placeholder, so all formats can be verified on one screen.
 * - In `adsense` mode the same sections render real units wherever a slot id
 *   resolves, and collapse where none does.
 * - Anchor / vignette intentionally have no visual: they are Auto Ads formats
 *   with no `<ins>` unit, so this page reports their eligibility status as
 *   text instead of faking a sticky bar or popup (that would violate policy).
 */
export const metadata = {
  title: 'Ad Format Preview (testing only)',
  robots: { index: false, follow: false },
};

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-lborder bg-card p-4 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-mtext">{title}</h2>
      <p className="mt-1 text-xs text-stext">{note}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AutoAdsStatus() {
  const autoAds = process.env.NEXT_PUBLIC_ADSENSE_AUTO_ADS === '1';
  const anchor = process.env.NEXT_PUBLIC_ADSENSE_ANCHOR !== '0';
  const vignette = process.env.NEXT_PUBLIC_ADSENSE_VIGNETTE !== '0';
  const rows: Array<[string, boolean, string]> = [
    ['Page-level Auto Ads', autoAds, 'NEXT_PUBLIC_ADSENSE_AUTO_ADS=1'],
    ['Anchor eligible', autoAds && anchor, 'AUTO_ADS=1 + ANCHOR≠0 + dashboard opt-in'],
    ['Vignette eligible', autoAds && vignette, 'AUTO_ADS=1 + VIGNETTE≠0 + dashboard opt-in'],
  ];
  return (
    <ul className="space-y-2 text-xs">
      {rows.map(([label, on, how]) => (
        <li key={label} className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-block rounded-full px-2 py-0.5 font-bold ${on ? 'bg-green-500/15 text-green-600' : 'bg-secondary text-stext'}`}
          >
            {on ? 'ON' : 'OFF'}
          </span>
          <span className="font-semibold text-mtext">{label}</span>
          <span className="text-stext">{how}</span>
        </li>
      ))}
      <li className="text-stext">
        Note: the AdSense dashboard toggle is the source of truth — these flags only make the site eligible.
      </li>
    </ul>
  );
}

export default function AdsPreviewPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 rounded-md border border-dashed border-accent/50 bg-card p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Testing only — not linked, not indexed</p>
        <h1 className="mt-1 text-2xl font-bold text-mtext">Ad format preview</h1>
        <p className="mt-1 text-sm text-stext">
          Every section below is a live ad slot. In dummy mode you see placeholders; after approval the same slots
          serve real Google ads with zero layout changes.
        </p>
      </header>

      <div className="space-y-6">
        <Section title="1 · Top banner" note="AdBanner → news-detail-top (responsive auto)">
          <AdBanner placement="news-detail-top" />
        </Section>

        <Section title="2 · Mid-content banner" note="AdBanner → home-mid (responsive auto)">
          <AdBanner placement="home-mid" />
        </Section>

        <Section title="3 · In-article fluid" note="AdInArticle → news-detail-inarticle (fluid)">
          <AdInArticle />
        </Section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Section title="4 · Sidebar box" note="Existing detail sidebar → news-detail-sidebar">
            <AdBanner placement="news-detail-sidebar" />
          </Section>
          <Section title="5 · Desktop side rail" note="AdSideRail → layout-sidebar (hidden below lg)">
            <AdSideRail />
          </Section>
        </div>

        <Section title="6 · Multiplex" note="AdMultiplex → home-multiplex (autorelaxed)">
          <AdMultiplex />
        </Section>

        <Section title="7 · Listing in-feed" note="In-feed card → news-list-infeed">
          <div className="max-w-sm">
            <AdBanner placement="news-list-infeed" />
          </div>
        </Section>

        <Section
          title="8 · Anchor / vignette"
          note="Dummy-mode simulators below (house mode only, this page only) — test the layout impact, then dismiss"
        >
          <div className="space-y-4">
            <AutoAdsStatus />
            <div className="flex flex-wrap items-center gap-3 border-t border-lborder pt-4">
              <SimulatedVignette />
              <p className="text-xs text-stext">
                The simulated anchor bar pins to the bottom of this page — compare it against the mobile bottom nav.
              </p>
            </div>
          </div>
        </Section>

        <Section title="9 · Lower banner" note="AdBanner → home-footer (responsive auto)">
          <AdBanner placement="home-footer" />
        </Section>
      </div>

      {/* Dummy-mode only: never renders in adsense/off modes (see component). */}
      <SimulatedAnchor />
    </div>
  );
}
