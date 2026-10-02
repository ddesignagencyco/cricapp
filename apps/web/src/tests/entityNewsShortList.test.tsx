import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RelatedNewsPanel } from '../components/boards/RelatedNewsPanel';
import { entityNewsHref } from '../components/EntityLinks';
import type { NewsArticle } from '../types';

/**
 * Every entity page shows a few stories and links to the rest, instead of inlining all of
 * them. A match page used to list every linked story under the match, which made the page
 * longer than the match it was describing, and the team, player and series tabs had the
 * same problem.
 *
 * Two things have to hold for that to be worth doing:
 *
 *   1. the panel has to actually cut the list and offer a way through, and
 *   2. all four entity surfaces have to be wired to it.
 *
 * The second one is checked against the source because these are large page components with
 * their own data fetching; rendering a team page in a unit test would mostly assert the
 * mocks. Reading the file is a blunt instrument, but it fails loudly the moment one surface
 * is left showing the full list, which is the regression being guarded.
 */

function story(id: string, title: string): NewsArticle {
  return {
    id,
    title,
    slug: id,
    excerpt: `${title} excerpt`,
    category: { id: 'c1', name: 'Cricket', slug: 'cricket' },
    author: { id: 'a1', name: 'Desk' },
    publishedAt: '2026-01-01T00:00:00.000Z',
    readTime: 3,
  } as unknown as NewsArticle;
}

const MANY = Array.from({ length: 9 }, (_, i) => story(`s${i}`, `Story number ${i}`));

describe('the panel cutting a long list down', () => {
  it('shows only as many stories as the limit allows', () => {
    render(
      <RelatedNewsPanel
        articles={MANY}
        emptyTitle="No news"
        emptyHint="Nothing linked yet."
        limit={3}
        viewAllHref="/news/by/team/t1"
        viewAllLabel="All news on this team"
      />,
    );
    expect(screen.getByText('Story number 0')).toBeInTheDocument();
    expect(screen.getByText('Story number 2')).toBeInTheDocument();
    expect(screen.queryByText('Story number 3')).not.toBeInTheDocument();
  });

  it('offers a way to the rest, and counts what is behind it', () => {
    render(
      <RelatedNewsPanel
        articles={MANY}
        emptyTitle="No news"
        emptyHint="Nothing linked yet."
        limit={3}
        viewAllHref="/news/by/team/t1"
        viewAllLabel="All news on this team"
      />,
    );
    const link = screen.getByRole('link', { name: /All news on this team/ });
    expect(link).toHaveAttribute('href', '/news/by/team/t1');
    expect(link).toHaveTextContent('9');
  });

  it('shows the whole list when there is no limit, and adds no link', () => {
    render(<RelatedNewsPanel articles={MANY} emptyTitle="No news" emptyHint="Nothing linked yet." />);
    expect(screen.getByText('Story number 8')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /All news/ })).not.toBeInTheDocument();
  });

  it('adds no link when the list already fits the limit', () => {
    render(
      <RelatedNewsPanel
        articles={MANY.slice(0, 3)}
        emptyTitle="No news"
        emptyHint="Nothing linked yet."
        limit={6}
        viewAllHref="/news/by/team/t1"
        viewAllLabel="All news on this team"
      />,
    );
    // Nothing is hidden, so there is nowhere to go.
    expect(screen.queryByRole('link', { name: /All news/ })).not.toBeInTheDocument();
  });

  it('counts the hidden stories instead of linking nowhere', () => {
    render(
      <RelatedNewsPanel articles={MANY} emptyTitle="No news" emptyHint="Nothing linked yet." limit={3} />,
    );
    // Without a destination the honest answer is how many are missing, not a dead link.
    // The stories themselves are links, so this looks for a "somewhere to go" link rather
    // than for the absence of links.
    expect(screen.getByText(/6 more stories/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /All news|View all|more stor/ })).not.toBeInTheDocument();
  });

  it('still explains itself when there is nothing to show', () => {
    render(
      <RelatedNewsPanel
        articles={[]}
        loading={false}
        emptyTitle="No team news"
        emptyHint="Link a story to see it here."
        limit={6}
        viewAllHref="/news/by/team/t1"
      />,
    );
    expect(screen.getByText('No team news')).toBeInTheDocument();
    // An empty list must not produce a "View all" leading to an empty page.
    expect(screen.queryByRole('link', { name: /All news|View all/ })).not.toBeInTheDocument();
  });
});

describe('the four entity pages pointing at their own news page', () => {
  it('builds the archive url for each kind of entity', () => {
    // The colon is left readable — a legal path character, and the same spelling the
    // rest of the site uses in its match and ticker links.
    expect(entityNewsHref('match', 'sr:match:7')).toBe('/news/by/match/sr:match:7');
    expect(entityNewsHref('team', 'sr:team:1')).toBe('/news/by/team/sr:team:1');
    expect(entityNewsHref('player', 'sr:player:9')).toBe('/news/by/player/sr:player:9');
    expect(entityNewsHref('series', 'tour:2026')).toBe('/news/by/series/tour:2026');
  });

  it('builds nothing when the id is missing, so the page cannot link to /undefined', () => {
    expect(entityNewsHref('team', null)).toBeNull();
    expect(entityNewsHref('team', '')).toBeNull();
  });

  const SURFACES = [
    { file: 'components/boards/MatchDetailBody.tsx', type: 'match' },
    { file: 'components/boards/TeamDetailBody.tsx', type: 'team' },
    { file: 'components/boards/PlayerDetailBody.tsx', type: 'player' },
    { file: 'app/tournaments/[id]/TournamentDetailPageClient.tsx', type: 'series' },
  ];

  it.each(SURFACES)('$file passes a limit and a view-all link', ({ file, type }) => {
    const source = readFileSync(join(__dirname, '..', file), 'utf8');
    expect(source).toMatch(/limit=\{\d+\}/);
    expect(source).toMatch(/viewAllHref=\{entityNewsHref\('([a-z]+)'/);
    expect(source).toContain(`entityNewsHref('${type}'`);
  });
});
