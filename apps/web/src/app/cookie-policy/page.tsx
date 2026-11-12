import PolicySectionsPage, { type PolicySection } from '../../components/PolicySectionsPage';

export const metadata = {
  title: 'Cookie Policy',
  description:
    'Which cookies CriczApp uses, why, how Google advertising cookies work, and how to control them.',
  alternates: { canonical: '/cookie-policy' },
};

const sections: PolicySection[] = [
  {
    id: 'what-are-cookies',
    title: 'What Are Cookies',
    text: 'Cookies are small text files stored on your device when you visit a website. Similar technologies such as local storage work the same way. They help a site remember your preferences and understand how it is used.',
  },
  {
    id: 'essential-cookies',
    title: 'Essential Cookies',
    text: 'These keep you signed in, protect your account and remember settings such as light or dark theme. The site cannot work properly without them, so they cannot be switched off.',
  },
  {
    id: 'analytics-cookies',
    title: 'Analytics Cookies',
    text: 'CriczApp does not currently set third-party analytics cookies. If we add analytics to understand how the site is used, this policy will be updated first and the data will only be used in aggregate.',
  },
  {
    id: 'advertising-cookies',
    title: 'Advertising Cookies',
    text: 'When advertising is enabled, Google and its partners use cookies to serve ads based on your visits to this and other websites, to limit how often you see an ad, and to measure ad performance. You can opt out of personalised advertising in Google Ads Settings, and of many third-party vendors at aboutads.info.',
  },
  {
    id: 'managing-cookies',
    title: 'Managing Cookies',
    text: 'You can block or delete cookies in your browser settings at any time. Blocking essential cookies may stop parts of the site, such as signing in, from working.',
  },
  {
    id: 'changes-to-this-policy',
    title: 'Changes to This Policy',
    text: 'We may update this policy as our services change. The date at the top of the page shows when it was last revised.',
  },
];

export default function CookiePolicyPage() {
  return (
    <PolicySectionsPage
      slug="cookie-policy"
      title="Cookie Policy"
      updatedAt="2026-11-12"
      intro="How CriczApp uses cookies and similar technologies, and the choices you have."
      sections={sections}
      footer={
        <p>
          See our <a href="/privacy">Privacy Policy</a> for how we handle personal information, or
          contact <a href="mailto:privacy@criczapp.com">privacy@criczapp.com</a>.
        </p>
      }
    />
  );
}
