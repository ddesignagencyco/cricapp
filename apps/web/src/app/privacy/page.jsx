export const metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy policy for PAK CRICZONE — how we collect, use and protect your information.',
};

const sections = [
  {
    title: 'Information We Collect',
    text: 'We collect information you provide directly, such as your name and email when you contact us. We also collect usage data including pages visited, device type and browser information to improve our service.',
  },
  {
    title: 'How We Use Your Information',
    text: 'We use collected information to provide and improve our cricket coverage, respond to your inquiries, send match alerts (if subscribed) and analyse usage trends to enhance the user experience.',
  },
  {
    title: 'Cookies & Tracking',
    text: 'PAK CRICZONE uses cookies to maintain your session preferences and analyse traffic. You can control cookie settings through your browser. We do not use third-party advertising trackers.',
  },
  {
    title: 'Data Sharing',
    text: 'We do not sell or rent your personal information to third parties. We may share anonymised, aggregated data for analytical purposes. Service providers who assist in running the site are bound by confidentiality obligations.',
  },
  {
    title: 'Data Security',
    text: 'We implement reasonable security measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.',
  },
  {
    title: 'Your Rights',
    text: 'You have the right to access, correct or delete your personal data. To exercise these rights, please contact us at privacy@pakcriczone.com.',
  },
  {
    title: 'Changes to This Policy',
    text: 'We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date. Continued use of the site after changes constitutes acceptance of the revised policy.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-mtext sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-stext">Last updated: September 2, 2026</p>
          <p className="mt-4 text-base leading-relaxed text-stext">
            At PAK CRICZONE, your privacy is important to us. This policy explains how we
            collect, use and protect your information when you use our website and services.
          </p>
        </div>

        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-bold text-mtext">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-stext">{s.text}</p>
          </div>
        ))}

        <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
          <p className="text-sm text-stext">
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:privacy@pakcriczone.com" className="font-semibold text-accent hover:text-accent2">
              privacy@pakcriczone.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
