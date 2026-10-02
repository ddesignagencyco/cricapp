import { render, screen } from '@testing-library/react';
import {
  TeamLink,
  PlayerLink,
  TournamentLink,
  matchHref,
  playerHref,
  teamHref,
  tournamentHref,
} from '../components/EntityLinks';

/**
 * A name is only a link when there is a real id behind it.
 *
 * This is the whole point of the change: every entity name on the detail pages used to be
 * plain text, and the obvious fix — wrapping the name in a `Link` — produces
 * `/teams/undefined` the moment the payload is missing an id. A dead link is worse than
 * plain text, so a missing id must render as text.
 */

describe('building a link only when there is something to link to', () => {
  it('links a real id, keeping the colon readable', () => {
    // A colon is a legal path character, so it is left as-is rather than becoming
    // `%3A`. The rest of the site already interpolates raw ids in its match and ticker
    // links, so encoding them here gave one site two spellings of the same URL.
    expect(teamHref('sr:team:1')).toBe('/teams/sr:team:1');
    expect(playerHref('sr:player:9')).toBe('/players/sr:player:9');
    expect(tournamentHref('tour:2026')).toBe('/tournaments/tour:2026');
    expect(matchHref('sr:match:7')).toBe('/matches/sr:match:7');
  });

  it('keeps the whole provider id, not a stripped number', () => {
    // `/api/teams/142690` is a 404; `/api/teams/sr:competitor:142690` resolves. The id
    // is what the teams table stores, so it is what the link has to carry.
    expect(teamHref('sr:competitor:142690')).toBe('/teams/sr:competitor:142690');
    expect(playerHref('sr:player:680246')).toBe('/players/sr:player:680246');
  });

  it('still escapes anything that would break a path segment', () => {
    // A space is not a `pchar`, so it is still encoded; only the colon is left alone.
    expect(teamHref('a b')).toBeNull();
    expect(tournamentHref('a/b')).toBe('/tournaments/a%2Fb');
  });

  it('refuses to build a link from a name, a blank, or a missing id', () => {
    // A name in the id slot would produce a URL with spaces that resolves to nothing.
    expect(teamHref('India')).toBeNull();
    expect(playerHref('Rohit Sharma')).toBeNull();
    expect(teamHref('')).toBeNull();
    expect(teamHref('   ')).toBeNull();
    expect(teamHref(null)).toBeNull();
    expect(teamHref(undefined)).toBeNull();
  });

  it('strips a display-name prefix but never an id prefix', () => {
    // `sr:sportradar:` leaks into a *name*; `sr:competitor:` is the id itself.
    expect(teamHref('sr:sportradar:India')).toBeNull();
    expect(teamHref('sr:team:1')).toBe('/teams/sr:team:1');
  });
});

describe('the link components', () => {
  it('renders a link when the id is known', () => {
    render(<TeamLink teamId="sr:team:1" name="India" />);
    expect(screen.getByRole('link', { name: 'India' })).toHaveAttribute('href', '/teams/sr:team:1');
  });

  it('renders plain text when the id is missing, and no href at all', () => {
    const { container } = render(<TeamLink name="India" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.textContent).toBe('India');
    // The specific failure being prevented.
    expect(container.innerHTML).not.toContain('undefined');
  });

  it('does the same for players and tournaments', () => {
    const withId = render(
      <>
        <PlayerLink playerId="sr:player:9" name="Rohit Sharma" />
        <TournamentLink tournamentId="tour:1" name="ODI Series" />
      </>,
    );
    expect(screen.getByRole('link', { name: 'Rohit Sharma' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ODI Series' })).toBeInTheDocument();
    withId.unmount();

    const without = render(
      <>
        <PlayerLink name="Rohit Sharma" />
        <TournamentLink name="ODI Series" />
      </>,
    );
    expect(without.container.innerHTML).not.toContain('undefined');
    expect(without.container.innerHTML).not.toContain('<a');
  });

  it('keeps the class it is given so it can sit inside a heading unchanged', () => {
    render(<TeamLink teamId="t1" name="India" className="text-lg font-black" />);
    const link = screen.getByRole('link', { name: 'India' });
    expect(link).toHaveClass('text-lg');
    expect(link).toHaveClass('font-black');
  });
});
