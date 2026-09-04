export const metadata = {
  title: 'Terms of Service',
  description:
    'Terms and conditions governing the use of PAK CRICZONE cricket coverage and services.',
};

const sections = [
  {
    title: 'Acceptance of Terms',
    text: 'By accessing or using PAK CRICZONE, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the site.',
  },
  {
    title: 'Use of the Service',
    text: 'PAK CRICZONE provides cricket scores, statistics, news and live stream links for informational and personal entertainment purposes only. You may not use the service for any commercial purpose without prior written consent.',
  },
  {
    title: 'Content Accuracy',
    text: 'While we strive for accuracy, match scores, statistics and other data displayed on the site may contain errors or delays. PAK CRICZONE is not liable for any decisions made based on the information presented.',
  },
  {
    title: 'Intellectual Property',
    text: 'All content on PAK CRICZONE — including design, graphics, logos and text — is owned by or licensed to us. You may not reproduce, distribute or create derivative works without permission.',
  },
  {
    title: 'User Conduct',
    text: 'You agree not to misuse the service, attempt to gain unauthorised access, introduce malicious code or engage in any activity that disrupts the site or its users.',
  },
  {
    title: 'Third-Party Links',
    text: 'Our site may contain links to external websites, including live stream platforms. We are not responsible for the content or practices of third-party sites.',
  },
  {
    title: 'Limitation of Liability',
    text: 'PAK CRICZONE and its team shall not be held liable for any indirect, incidental or consequential damages arising from your use of or inability to use the service.',
  },
  {
    title: 'Termination',
    text: 'We reserve the right to suspend or terminate access to the service at our discretion, without notice, for conduct that we believe violates these terms or is harmful to other users.',
  },
  {
    title: 'Changes to Terms',
    text: 'We may modify these terms at any time. Updated terms will be posted on this page. Your continued use of the site after changes constitutes acceptance of the revised terms.',
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-mtext sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-stext">Last updated: September 2, 2026</p>
          <p className="mt-4 text-base leading-relaxed text-stext">
            Please read these Terms of Service carefully before using PAK CRICZONE. They govern
            your access to and use of our website and services.
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
            For questions about these Terms, contact us at{' '}
            <a href="mailto:legal@pakcriczone.com" className="font-semibold text-accent hover:text-accent2">
              legal@pakcriczone.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
