import PolicySectionsPage, { type PolicySection } from '../../components/PolicySectionsPage';

export const metadata = {
  title: 'Editorial Policy',
  description:
    'How CriczApp reports cricket news, sources match data, keeps editorial independence and labels sponsored content.',
  alternates: { canonical: '/editorial-policy' },
};

const sections: PolicySection[] = [
  {
    id: 'our-commitment',
    title: 'Our Commitment',
    text: 'CriczApp exists to give cricket fans fast, accurate and fair coverage. Every story, scorecard and statistic we publish is held to the same standard: it must be correct, clearly sourced and presented without bias towards any team, player or board.',
  },
  {
    id: 'sources-and-verification',
    title: 'Sources & Verification',
    text: 'Live scores, fixtures and statistics come from licensed sports data providers and are updated automatically. News reports rely on official announcements, on-record statements and reputable outlets, and are verified before publication. Where a report is based on a single source or is still developing, we say so in the story.',
  },
  {
    id: 'editorial-independence',
    title: 'Editorial Independence',
    text: 'Editorial decisions are made by our editors alone. Advertisers, sponsors, teams and data partners have no say over what we cover or how we cover it, and they never see stories before publication.',
  },
  {
    id: 'opinion-and-analysis',
    title: 'Opinion & Analysis',
    text: 'Match predictions, previews and opinion pieces are clearly labelled. Predictions are model-based estimates for entertainment and analysis only; they are not betting advice and do not guarantee any result.',
  },
  {
    id: 'advertising-and-sponsored-content',
    title: 'Advertising & Sponsored Content',
    text: 'Advertising is kept visually separate from editorial content and is marked as an ad. Any sponsored or partner content is labelled as such. We do not accept payment in exchange for coverage.',
  },
  {
    id: 'ai-and-automation',
    title: 'AI & Automation',
    text: 'Scores, scorecards and some statistical summaries are generated automatically from data feeds. Automated or AI-assisted text is reviewed against the underlying data, and an editor is accountable for everything published under the CriczApp name.',
  },
  {
    id: 'images-and-copyright',
    title: 'Images & Copyright',
    text: 'We use images we own, have licensed, or are permitted to use, and credit the source where required. Rights holders who believe their material has been used incorrectly can contact us and we will review the request promptly.',
  },
  {
    id: 'corrections',
    title: 'Corrections',
    text: 'When we get something wrong we fix it quickly and transparently. Our Corrections page explains how to report an error and how corrections are made.',
  },
];

export default function EditorialPolicyPage() {
  return (
    <PolicySectionsPage
      slug="editorial-policy"
      title="Editorial Policy"
      updatedAt="2026-11-12"
      intro="The standards behind every score, story and statistic published on CriczApp."
      sections={sections}
      footer={
        <p>
          Questions about our editorial standards can be sent to{' '}
          <a href="mailto:hello@criczapp.com">hello@criczapp.com</a>.
        </p>
      }
    />
  );
}
