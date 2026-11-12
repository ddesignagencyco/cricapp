import PolicySectionsPage, { type PolicySection } from '../../components/PolicySectionsPage';

export const metadata = {
  title: 'Disclaimer',
  description:
    'Disclaimer for CriczApp covering live score accuracy, predictions, odds, external links and trademarks.',
  alternates: { canonical: '/disclaimer' },
};

const sections: PolicySection[] = [
  {
    id: 'general-information',
    title: 'General Information',
    text: 'All content on CriczApp, including scores, statistics, news and analysis, is provided for general information and entertainment. While we work to keep it accurate and up to date, we make no warranties about its completeness, reliability or availability.',
  },
  {
    id: 'live-scores-and-data',
    title: 'Live Scores & Data',
    text: 'Live scores and statistics are supplied by third-party data providers and may be delayed or contain errors. Always refer to the official scorer or governing body for definitive results.',
  },
  {
    id: 'predictions-and-odds',
    title: 'Predictions & Odds',
    text: 'Win probabilities, predictions and any odds information are estimates for analysis and entertainment only. They are not financial or betting advice. CriczApp does not accept bets, and you are responsible for complying with the laws that apply where you live.',
  },
  {
    id: 'external-links-and-streams',
    title: 'External Links & Streams',
    text: 'CriczApp may link to third-party websites and official broadcasters. We do not host video streams and are not responsible for the content, availability or practices of external sites.',
  },
  {
    id: 'trademarks',
    title: 'Trademarks',
    text: 'Team names, league names, logos and other marks belong to their respective owners and are used for identification only. Their use does not imply endorsement of or affiliation with CriczApp.',
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    text: 'CriczApp is not liable for any loss or damage arising from the use of, or reliance on, information on this site. Your use of the site is at your own risk.',
  },
];

export default function DisclaimerPage() {
  return (
    <PolicySectionsPage
      slug="disclaimer"
      title="Disclaimer"
      updatedAt="2026-11-12"
      intro="Please read this disclaimer before relying on any information published on CriczApp."
      sections={sections}
      footer={
        <p>
          Questions about this disclaimer can be sent to{' '}
          <a href="mailto:legal@criczapp.com">legal@criczapp.com</a>.
        </p>
      }
    />
  );
}
