import type { ReactNode } from 'react';
import EditorialDocument from './EditorialDocument';
import EditorialLayout from './EditorialLayout';
import { fetchEditorialPage } from '../services/editorial';

export type PolicySection = { id: string; title: string; text: string };

/**
 * A company page made of titled sections. An admin-saved editorial page with the
 * same slug replaces the built-in copy, so the page always renders something
 * instead of 404ing before the CMS row exists.
 */
export default async function PolicySectionsPage({
  slug,
  title,
  intro,
  updatedAt,
  sections,
  footer,
}: {
  slug: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: PolicySection[];
  footer?: ReactNode;
}) {
  const cms = await fetchEditorialPage(slug).catch(() => null);
  if (cms?.content?.trim()) return <EditorialDocument page={cms} />;

  return (
    <EditorialLayout
      title={title}
      slug={slug}
      updatedAt={updatedAt}
      intro={intro}
      toc={sections.map((section) => ({ id: section.id, label: section.title }))}
    >
      {sections.map((section) => (
        <section key={section.id}>
          <h2 id={section.id}>{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))}
      {footer}
    </EditorialLayout>
  );
}
