import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TournamentDetailPageClient from '../app/tournaments/[id]/TournamentDetailPageClient';
import type { TournamentInfo } from '../services/tournaments';

jest.mock('../components/AuthProvider', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isAdmin: false, loading: false, isSuperAdmin: false }),
}));

// The page mounts RelatedNewsPanel, which fetches /news for the tournament on
// every render. Nothing in this suite looks at that panel, and an unanswered
// request keeps the panel in its loading state, so the fetch cannot land a
// state update after an assertion has finished. Left unmocked it was also a
// real network call per test.
jest.mock('../services/news', () => ({
  ...jest.requireActual('../services/news'),
  fetchNews: jest.fn(() => new Promise(() => undefined)),
}));

/**
 * The exact payload GET /tournaments/sr:tournament:51842/info returns.
 * `groups` is null for this one, which is the case worth pinning down.
 */
const bagmatiInfo = {
  generated_at: '2026-09-29T13:47:23.282Z',
  tournament: {
    id: 'sr:tournament:51842',
    name: 'Bagmati Cup T20',
    type: 't20',
    gender: 'men',
    category: { id: 'sr:category:2341', name: 'Nepal', country_code: 'NPL' },
    current_season: {
      id: 'sr:season:142246',
      name: 'Bagmati Cup T20 2026',
      year: '2026',
      end_date: '2026-06-09',
      start_date: '2026-05-31',
    },
    sport: { id: 'sr:sport:21', name: 'Cricket' },
    tour_id: null,
    parent_id: null,
  },
  groups: null,
} as unknown as TournamentInfo;

const tournament = {
  id: 'sr:tournament:51842',
  name: 'Bagmati Cup T20',
  type: 't20',
  gender: 'men',
};

function renderPage(info: TournamentInfo | null = bagmatiInfo) {
  return render(
    <TournamentDetailPageClient
      tournament={tournament}
      seasons={[]}
      resultsBySeason={{}}
      initialSeasonId=""
      info={info}
    />,
  );
}

async function openInfoTab() {
  const { container } = renderPage();
  await userEvent.click(screen.getByRole('tab', { name: /info/i }));
  // The name also appears in the breadcrumb, so assertions read the panel only.
  const panel = container.querySelector('section') as HTMLElement;
  return { container, panel, panelText: panel.textContent || '' };
}

describe('tournament detail — Info tab', () => {
  it('opens on Results, not Info', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /results/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('has an Info tab to click', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /info/i })).toBeInTheDocument();
  });

  it('shows the tournament name from the snapshot', async () => {
    const { panelText } = await openInfoTab();
    expect(panelText).toContain('Bagmati Cup T20');
  });

  it('shows the type and gender', async () => {
    const { panelText } = await openInfoTab();
    expect(panelText).toContain('t20');
    expect(panelText).toContain('men');
  });

  it('shows the category name, id and country code', async () => {
    const { panelText } = await openInfoTab();
    expect(panelText).toContain('Nepal');
    expect(panelText).toContain('sr:category:2341');
    expect(panelText).toContain('NPL');
  });

  it('shows the current season name and id', async () => {
    const { panelText } = await openInfoTab();
    expect(panelText).toContain('Bagmati Cup T20 2026');
    expect(panelText).toContain('sr:season:142246');
  });

  it('shows the season start and end dates', async () => {
    // These two dates are the part of the payload that exists nowhere else in
    // the app, so losing them loses real information.
    const { panelText } = await openInfoTab();
    expect(panelText).toContain('2026-05-31');
    expect(panelText).toContain('2026-06-09');
  });

  it('shows the sport name and id', async () => {
    const { panelText } = await openInfoTab();
    expect(panelText).toContain('Cricket');
    expect(panelText).toContain('sr:sport:21');
  });

  it('shows the snapshot timestamp and the lag warning', async () => {
    const { panelText } = await openInfoTab();
    expect(screen.getByText(/stored data snapshot/i)).toBeInTheDocument();
    expect(panelText).toContain('2026-09-29');
  });

  it('renders null ids as an em dash rather than blank or "null"', async () => {
    const { panelText } = await openInfoTab();
    expect(panelText).toContain('Tour id');
    expect(panelText).not.toContain('null');
  });

  it('omits the Groups section when groups is null', async () => {
    await openInfoTab();
    expect(screen.queryByText('Groups')).not.toBeInTheDocument();
  });

  it('omits the Teams tab when there are no groups at all', () => {
    // groups: null means the provider stored no team list, so the tab would be
    // an empty shell.
    renderPage();
    expect(screen.queryByRole('tab', { name: /teams/i })).not.toBeInTheDocument();
  });

  it('adds the Teams tab once groups arrive', () => {
    renderPage({
      ...bagmatiInfo,
      groups: [{ name: 'Group A', teams: [{ id: 'sr:competitor:1', name: 'Nepal' }] }],
    } as unknown as TournamentInfo);
    expect(screen.getByRole('tab', { name: /teams/i })).toBeInTheDocument();
  });

  it('falls back to the tournament record when there is no snapshot', async () => {
    const { container } = renderPage(null);
    await userEvent.click(screen.getByRole('tab', { name: /info/i }));
    expect(screen.getByText(/no stored snapshot yet/i)).toBeInTheDocument();
    expect((container.querySelector('section') as HTMLElement).textContent).toContain('Bagmati Cup T20');
  });

  it('still shows the name from the fallback record when there is no snapshot', async () => {
    const { container } = renderPage(null);
    await userEvent.click(screen.getByRole('tab', { name: /info/i }));
    expect((container.querySelector('section') as HTMLElement).textContent).toContain('sr:tournament:51842');
  });
});
