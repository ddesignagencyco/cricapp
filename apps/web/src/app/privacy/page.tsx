import EditorialDocument from '../../components/EditorialDocument';
import EditorialLayout from '../../components/EditorialLayout';
import { fetchEditorialPage } from '../../services/editorial';
import { loadSiteSettings } from '../../services/siteSettings';
import type { AdConfig } from '../../lib/advertisements/registry';

export const metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy policy for PAK CRICZONE — how we collect, use and protect your information.',
};

type Section = { id: string; title: string; text: string };

const BASE_SECTIONS: Section[] = [
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    text: 'We collect information you provide directly, such as your name and email when you contact us. We also collect usage data including pages visited, device type and browser information to improve our service.',
  },
  {
    id: 'how-we-use-your-information',
    title: 'How We Use Your Information',
    text: 'We use collected information to provide and improve our cricket coverage, respond to your inquiries, send match alerts (if subscribed) and analyse usage trends to enhance the user experience.',
  },
  {
    id: 'cookies-tracking',
    title: 'Cookies & Tracking',
    text: '',
  },
];

const TRAILING_SECTIONS: Section[] = [
  {
    id: 'data-sharing',
    title: 'Data Sharing',
    text: 'We do not sell or rent your personal information to third parties. We may share anonymised, aggregated data for analytical purposes. Service providers who assist in running the site are bound by confidentiality obligations.',
  },
  {
    id: 'data-security',
    title: 'Data Security',
    text: 'We implement reasonable security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.',
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    text: 'You have the right to access, correct or delete your personal data. To exercise these rights, please contact us at privacy@pakcriczone.com.',
  },
  {
    id: 'changes-to-this-policy',
    title: 'Changes to This Policy',
    text: 'We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date. Continued use of the site after changes constitutes acceptance of the revised policy.',
  },
];

/**
 * The advertising disclosure has to follow the live ad mode.
 *
 * This page previously claimed "We do not use third-party advertising trackers",
 * which is true while placements render our own placeholder creatives and false the
 * moment `ads.mode` is switched to `adsense` — AdSense sets third-party cookies.
 * Deriving the copy from the config means the claim cannot drift out of date again.
 */
function sectionsFor(ads: AdConfig): Section[] {
  const advertisingLive = ads.mode === 'adsense' && Boolean(ads.clientId);

  const cookies: Section = advertisingLive
    ? {
        id: 'cookies-tracking',
        title: 'Cookies & Tracking',
        text: 'PAK CRICZONE uses cookies to maintain your session preferences and analyse traffic. While advertising is enabled we also use Google AdSense, which places third-party cookies and similar technologies to serve ads based on your prior visits to this and other websites. You can control or remove cookies through your browser settings, and you can opt out of personalised advertising at Google Ads Settings and of third-party vendor cookies at aboutads.info.',
      }
    : {
        id: 'cookies-tracking',
        title: 'Cookies & Tracking',
        text: 'PAK CRICZONE uses cookies to maintain your session preferences and analyse traffic. You can control cookie settings through your browser. We do not use third-party advertising trackers.',
      };

  const advertising: Section[] = advertisingLive
    ? [
        {
          id: 'advertising',
          title: 'Advertising',
          text: 'We use Google AdSense to display advertisements on this site. Google and its partners may use cookies and device identifiers to serve and measure ads based on your visits to this and other sites. Advertising is not served on every page: some routes are excluded, and some placements are switched off entirely. Where an ad is served, Google may use your activity to personalise the ads you see. Learn more about how Google uses data from sites and apps that use its services in the Google Privacy & Terms site.',
        },
      ]
    : [];

  return [BASE_SECTIONS[0], BASE_SECTIONS[1], cookies, ...advertising, ...TRAILING_SECTIONS];
}

export default async function PrivacyPage() {
  const cms = await fetchEditorialPage('privacy').catch(() => null);
  if (cms?.content?.trim()) return <EditorialDocument page={cms} />;

  const { ads } = await loadSiteSettings();
  const sections = sectionsFor(ads);

  return (
    <EditorialLayout
      title="Privacy Policy"
      slug="privacy"
      updatedAt="2026-09-02"
      intro="At PAK CRICZONE, your privacy is important to us. This policy explains how we collect, use and protect your information when you use our website and services."
      toc={sections.map((section) => ({ id: section.id, label: section.title }))}
    >
      {sections.map((section) => (
        <section key={section.id}>
          <h2 id={section.id}>{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))}
      <p>
        If you have any questions about this Privacy Policy, please contact us at{' '}
        <a href="mailto:privacy@pakcriczone.com">privacy@pakcriczone.com</a>.
      </p>
    </EditorialLayout>
  );
}
