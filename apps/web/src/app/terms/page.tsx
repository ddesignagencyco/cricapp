import EditorialDocument from '../../components/EditorialDocument';
import EditorialLayout from '../../components/EditorialLayout';
import { fetchEditorialPage } from '../../services/editorial';

export const metadata = {
  title: 'Terms of Service',
  description:
    'Terms and conditions governing the use of PAK CRICZONE cricket coverage and services.',
};

const sections = [
  {
    id: 'acceptance-of-terms',
    title: 'Acceptance of Terms',
    text: 'By accessing or using PAK CRICZONE, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the site.',
  },
  {
    id: 'use-of-the-service',
    title: 'Use of the Service',
    text: 'PAK CRICZONE provides cricket scores, statistics, news and live stream links for informational and personal entertainment purposes only. You may not use the service for any commercial purpose without prior written consent.',
  },
  {
    id: 'content-accuracy',
    title: 'Content Accuracy',
    text: 'While we strive for accuracy, match scores, statistics and other data displayed on the site may contain errors or delays. PAK CRICZONE is not liable for any decisions made based on the information presented.',
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    text: 'All content on PAK CRICZONE — including design, graphics, logos and text — is owned by or licensed to us. You may not reproduce, distribute or create derivative works without permission.',
  },
  {
    id: 'user-conduct',
    title: 'User Conduct',
    text: 'You agree not to misuse the service, attempt to gain unauthorised access, introduce malicious code or engage in any activity that disrupts the site or its users.',
  },
  {
    id: 'third-party-links',
    title: 'Third-Party Links',
    text: 'Our site may contain links to external websites, including live stream platforms. We are not responsible for the content or practices of third-party sites.',
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    text: 'PAK CRICZONE and its team shall not be held liable for any indirect, incidental or consequential damages arising from your use of or inability to use the service.',
  },
  {
    id: 'termination',
    title: 'Termination',
    text: 'We reserve the right to suspend or terminate access to the service at our discretion, without notice, for conduct that we believe violates these terms or is harmful to other users.',
  },
  {
    id: 'changes-to-terms',
    title: 'Changes to Terms',
    text: 'We may modify these terms at any time. Updated terms will be posted on this page. Your continued use of the site after changes constitutes acceptance of the revised terms.',
  },
];

export default async function TermsPage() {
  const cms = await fetchEditorialPage('terms').catch(() => null);
  if (cms?.content?.trim()) return <EditorialDocument page={cms} />;

  return (
    <EditorialLayout
      title="Terms of Service"
      slug="terms"
      updatedAt="2026-09-02"
      intro="Please read these Terms of Service carefully before using PAK CRICZONE. They govern your access to and use of our website and services."
      toc={sections.map((section) => ({ id: section.id, label: section.title }))}
    >
      {sections.map((section) => (
        <section key={section.id}>
          <h2 id={section.id}>{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))}
      <p>
        For questions about these Terms, contact us at{' '}
        <a href="mailto:legal@pakcriczone.com">legal@pakcriczone.com</a>.
      </p>
    </EditorialLayout>
  );
}
