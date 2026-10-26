/*
 * The website's built-in copy for its policy pages (cric_info/apps/web/src/app
 * about, privacy, terms), shown when the CMS (/editorial-pages/:slug) has no
 * published content for that page — the same rule the website follows.
 */

export interface EditorialSection {
  title: string;
  text: string;
}

export interface EditorialFallback {
  title: string;
  intro: string;
  updatedAt?: string;
  sections: EditorialSection[];
  /** Closing line, e.g. who to contact. */
  outro?: string;
}

export const EDITORIAL_FALLBACK: Record<string, EditorialFallback> = {
  about: {
    title: 'About PAK CRICZONE',
    intro: 'Your home for live cricket scores, PSL fixtures, teams, players and in-depth analysis — built for fans who follow every ball.',
    sections: [
      {
        title: '',
        text: 'PAK CRICZONE is your destination for cricket coverage in Pakistan and beyond. From live ball-by-ball scores and PSL fixtures to player profiles and historical statistics, we bring the game closer to you.',
      },
      {
        title: '',
        text: 'Our mission is to provide fans with fast, accurate and clearly presented cricket information — whether you are following the Pakistan Super League, international series or domestic tournaments.',
      },
      { title: 'Real-Time Coverage', text: 'Ball-by-ball updates, live scores and instant match alerts so you never miss a moment.' },
      { title: 'Trusted Data', text: 'Accurate statistics, verified results and comprehensive player profiles you can rely on.' },
      { title: 'Deep Analysis', text: 'Expert match reports, tactical breakdowns and statistical insights beyond the surface.' },
      { title: 'For Fans', text: 'Built by cricket lovers, for cricket lovers. Every feature designed with the fan experience in mind.' },
      {
        title: 'Our story',
        text: 'PAK CRICZONE was created to fill the gap for a dedicated, fan-first cricket platform focused on Pakistani cricket. Starting with PSL coverage, we aim to expand into full international reporting, fantasy insights and community features.\n\nEvery run, every ball, every wicket — live and at your fingertips.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updatedAt: '2026-09-02',
    intro: 'At PAK CRICZONE, your privacy is important to us. This policy explains how we collect, use and protect your information when you use our website and services.',
    sections: [
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
    ],
    outro: 'If you have any questions about this Privacy Policy, please contact us at privacy@pakcriczone.com.',
  },
  terms: {
    title: 'Terms of Service',
    updatedAt: '2026-09-02',
    intro: 'Please read these Terms of Service carefully before using PAK CRICZONE. They govern your access to and use of our website and services.',
    sections: [
      { title: 'Acceptance of Terms', text: 'By accessing or using PAK CRICZONE, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the site.' },
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
    ],
    outro: 'For questions about these Terms, contact us at legal@pakcriczone.com.',
  },
};
