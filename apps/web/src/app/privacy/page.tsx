import EditorialDocument from '../../components/EditorialDocument';
import EditorialLayout from '../../components/EditorialLayout';
import { fetchEditorialPage } from '../../services/editorial';

export const metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy policy for PAK CRICZONE — how we collect, use and protect your information.',
};

const sections = [
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
    text: 'PAK CRICZONE uses cookies to maintain your session preferences and analyse traffic. You can control cookie settings through your browser. We do not use third-party advertising trackers.',
  },
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

export default async function PrivacyPage() {
  const cms = await fetchEditorialPage('privacy').catch(() => null);
  if (cms?.content?.trim()) return <EditorialDocument page={cms} />;

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
