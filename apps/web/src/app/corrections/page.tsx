import PolicySectionsPage, { type PolicySection } from '../../components/PolicySectionsPage';

export const metadata = {
  title: 'Corrections',
  description:
    'How to report an error on CriczApp and how we correct scores, statistics and news stories.',
  alternates: { canonical: '/corrections' },
};

const sections: PolicySection[] = [
  {
    id: 'reporting-an-error',
    title: 'Reporting an Error',
    text: 'If you spot a mistake in a score, statistic, player profile or news story, email feedback@criczapp.com with the page link, what is wrong and, where possible, a source for the correct information. You can also reach us through the Contact page.',
  },
  {
    id: 'how-we-review',
    title: 'How We Review Reports',
    text: 'Every report is read by an editor. Factual errors in news stories are reviewed within one working day. Data issues in live scores or statistics are checked against our data provider and, where the provider is at fault, raised with them directly.',
  },
  {
    id: 'how-we-correct',
    title: 'How We Correct',
    text: 'Minor fixes such as spelling or formatting are made without a note. Corrections that change the meaning of a story, a result or a statistic are made in place and marked with a dated correction note at the end of the article explaining what changed.',
  },
  {
    id: 'live-data',
    title: 'Live Scores & Statistics',
    text: 'Live scores are delivered automatically and can briefly lag or differ from the official scorer during play. These differences are corrected as the data provider updates; final results always follow the official scorecard.',
  },
  {
    id: 'removal-requests',
    title: 'Updates & Removal Requests',
    text: 'We do not remove accurate published stories on request, but we will update a story when new facts emerge. Legal, privacy or copyright removal requests should be sent to legal@criczapp.com.',
  },
];

export default function CorrectionsPage() {
  return (
    <PolicySectionsPage
      slug="corrections"
      title="Corrections"
      updatedAt="2026-11-12"
      intro="Accuracy matters to us. Here is how to tell us about a mistake and how we put it right."
      sections={sections}
      footer={
        <p>
          Report an error at <a href="mailto:feedback@criczapp.com">feedback@criczapp.com</a>.
        </p>
      }
    />
  );
}
