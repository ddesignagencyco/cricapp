import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Badge, { StatusBadge, normalizeStatus, BlinkingDot } from '../components/Badge';
import LiveIndicator from '../components/LiveIndicator';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import RemoteImage from '../components/RemoteImage';
import MatchCardCompact from '../components/MatchCardCompact';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => refresh() }) }));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { fill, unoptimized, sizes, fit, ...rest } = props;
    void fill;
    void unoptimized;
    void sizes;
    void fit;
    // eslint-disable-next-line @next/next/no-img-element
    return <img data-testid="next-image" alt={String(props.alt)} {...rest} />;
  },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  refresh.mockClear();
});

describe('normalizeStatus', () => {
  it('maps a live status to the live tone', () => {
    expect(normalizeStatus('live')).toEqual({ label: 'Live', tone: 'live' });
  });

  it('is case and separator insensitive', () => {
    expect(normalizeStatus('  In Review ')).toEqual({ label: 'In Review', tone: 'in_review' });
    expect(normalizeStatus('not-started')).toEqual({ label: 'Upcoming', tone: 'upcoming' });
  });

  it('collapses internal spaces and hyphens to underscores', () => {
    // 'first_innings' is not a tone anyone has colours for, so it falls back to
    // neutral while the label still reads as a proper sentence.
    expect(normalizeStatus('first innings')).toEqual({ label: 'First Innings', tone: 'neutral' });
  });

  it('inherits the tone of an aliased provider status', () => {
    expect(normalizeStatus('closed')).toEqual({ label: 'Completed', tone: 'completed' });
    expect(normalizeStatus('ended')).toEqual({ label: 'Completed', tone: 'completed' });
    expect(normalizeStatus('canceled')).toEqual({ label: 'Cancelled', tone: 'cancelled' });
  });

  it('falls back to a title-cased label for an unmapped status', () => {
    expect(normalizeStatus('rain_reduced')).toEqual({ label: 'Rain Reduced', tone: 'neutral' });
  });

  it('title-cases an unknown status with hyphens and underscores', () => {
    expect(normalizeStatus('in_progress-now').label).toBe('In Progress Now');
  });

  it('labels a missing status as Unknown with a neutral tone', () => {
    expect(normalizeStatus(null)).toEqual({ label: 'Unknown', tone: 'neutral' });
    expect(normalizeStatus(undefined)).toEqual({ label: 'Unknown', tone: 'neutral' });
    expect(normalizeStatus('')).toEqual({ label: 'Unknown', tone: 'neutral' });
  });

  it('returns a tone the palette table knows how to colour', () => {
    // normalizeStatus hands back the status token itself (e.g. 'completed');
    // Badge.resolvePalette is what turns that token into a palette name.
    ['live', 'completed', 'weird_status', 'zzz'].forEach((s) => {
      const { tone } = normalizeStatus(s);
      expect(
        ['primary', 'success', 'warning', 'danger', 'neutral', 'live', 'completed', 'upcoming'].includes(tone),
      ).toBe(true);
    });
  });
});

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies the tone foreground and background', () => {
    render(<Badge tone="success">Published</Badge>);
    const badge = screen.getByText('Published');
    expect(badge).toHaveStyle({ color: 'var(--color-badge-success-fg)' });
  });

  it('falls back to the neutral palette for an unknown tone', () => {
    render(<Badge tone="not-a-tone">X</Badge>);
    expect(screen.getByText('X')).toHaveStyle({ color: 'var(--color-badge-neutral-fg)' });
  });

  it('is case insensitive on the tone', () => {
    render(<Badge tone="SUCCESS">A</Badge>);
    expect(screen.getByText('A')).toHaveStyle({ color: 'var(--color-badge-success-fg)' });
  });

  it('strips a conflicting uppercase class so the capitalised text is not shouted', () => {
    render(<Badge className="uppercase   font-bold">x</Badge>);
    const badge = screen.getByText('x');
    expect(badge.className).not.toMatch(/\buppercase\b/);
    expect(badge.className).toContain('font-bold');
  });

  it('lets a caller style override the palette', () => {
    render(
      <Badge style={{ background: 'red' }}>
        y
      </Badge>,
    );
    expect(screen.getByText('y')).toHaveStyle({ background: 'red' });
  });
});

describe('StatusBadge', () => {
  it('renders live through the shared live pill, not a plain badge', () => {
    const { container } = render(<StatusBadge status="live" />);
    // The live pill paints its own inline background, a plain badge uses a
    // palette token, so the two are distinguishable.
    expect(screen.getByText('Live')).toHaveStyle({ background: 'var(--color-danger-soft)' });
    expect(container.querySelector('.live-ping')).toBeInTheDocument();
  });

  it('renders a non-live status as a normal badge with the mapped label', () => {
    render(<StatusBadge status="closed" />);
    const el = screen.getByText('Completed');
    expect(el).toHaveStyle({ color: 'var(--color-badge-success-fg)' });
  });

  it('shows Unknown for a missing status', () => {
    render(<StatusBadge status={null} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

describe('BlinkingDot and LiveIndicator', () => {
  it('renders the dot as decorative so it is skipped by screen readers', () => {
    const { container } = render(<BlinkingDot />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('inherits the current text colour', () => {
    const { container } = render(<BlinkingDot />);
    const ping = container.querySelector('.live-ping') as HTMLElement;
    expect(ping.style.background).toBe('currentColor');
  });

  it('defaults the label to Live', () => {
    render(<LiveIndicator />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<LiveIndicator label="Live now" />);
    expect(screen.getByText('Live now')).toBeInTheDocument();
  });

  it('strips uppercase so the label reads as a word, not a shout', () => {
    const { container } = render(<LiveIndicator className="uppercase  text-sm" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).not.toMatch(/\buppercase\b/);
    expect(span.className).toContain('text-sm');
  });
});

describe('ErrorState', () => {
  it('announces itself as an alert for screen readers', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('uses the default title and message', () => {
    render(<ErrorState />);
    expect(screen.getByText('Server unavailable')).toBeInTheDocument();
    expect(screen.getByText('This content could not be loaded.')).toBeInTheDocument();
  });

  it('renders custom copy', () => {
    render(<ErrorState title="Feed down" message="Try again shortly" />);
    expect(screen.getByText('Feed down')).toBeInTheDocument();
    expect(screen.getByText('Try again shortly')).toBeInTheDocument();
  });

  it('calls the supplied onRetry', async () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('falls back to a router refresh when no handler is given', async () => {
    render(<ErrorState />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('shows the default title and an empty message', () => {
    render(<EmptyState />);
    expect(screen.getByText('Nothing found')).toBeInTheDocument();
  });

  it('renders custom copy and children', () => {
    render(
      <EmptyState title="No matches" message="Try another date">
        <button type="button">Clear filters</button>
      </EmptyState>,
    );
    expect(screen.getByText('No matches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  const onPageChange = jest.fn();

  beforeEach(() => onPageChange.mockClear());

  it('renders nothing when there is a single page and no total', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={onPageChange} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('still renders the range summary for a single page when a total is known', () => {
    render(<Pagination page={1} totalPages={1} total={5} limit={20} onPageChange={onPageChange} />);
    expect(screen.getByText('Showing 1–5 of 5')).toBeInTheDocument();
  });

  it('shows the page counter when no totals are supplied', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  it('lists every page when there are seven or fewer', () => {
    render(<Pagination page={1} totalPages={7} onPageChange={onPageChange} />);
    for (let p = 1; p <= 7; p += 1) {
      expect(screen.getByRole('button', { name: `Page ${p}` })).toBeInTheDocument();
    }
  });

  it('marks the current page for assistive tech', () => {
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current');
  });

  it('elides the middle of a long range', () => {
    const { container } = render(<Pagination page={10} totalPages={20} onPageChange={onPageChange} />);
    expect(container.textContent).toContain('…');
  });

  it('disables previous on the first page and next on the last', () => {
    const { unmount } = render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    unmount();

    render(<Pagination page={5} totalPages={5} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('never navigates past the ends', async () => {
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it('clamps a page number outside the range', () => {
    render(<Pagination page={99} totalPages={5} onPageChange={onPageChange} />);
    expect(screen.getByText('Page 5 of 5')).toBeInTheDocument();
  });

  it('survives a zero or negative totalPages', () => {
    const { container } = render(<Pagination page={1} totalPages={0} onPageChange={onPageChange} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not show an empty range for a zero total', () => {
    render(<Pagination page={1} totalPages={3} total={0} limit={20} onPageChange={onPageChange} />);
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('computes the visible window for the current page', () => {
    render(<Pagination page={2} totalPages={10} total={200} limit={20} onPageChange={onPageChange} />);
    expect(screen.getByText('Showing 21–40 of 200')).toBeInTheDocument();
  });
});

describe('RemoteImage', () => {
  it('renders the alt text, which is required for accessibility', () => {
    render(<RemoteImage src="https://i.test/a.jpg" alt="A team" />);
    expect(screen.getByAltText('A team')).toBeInTheDocument();
  });

  it('defaults to a square box so the image reserves space before load', () => {
    render(<RemoteImage src="https://i.test/a.jpg" alt="A" />);
    const img = screen.getByTestId('next-image');
    expect(img).toHaveAttribute('width', '96');
    expect(img).toHaveAttribute('height', '96');
  });

  it('uses the explicit dimensions when given', () => {
    render(<RemoteImage src="https://i.test/a.jpg" alt="A" width={28} height={28} />);
    const img = screen.getByTestId('next-image');
    expect(img).toHaveAttribute('width', '28');
    expect(img).toHaveAttribute('height', '28');
  });

  it('inherits the current text colour for the news image class', () => {
    // Article bodies letterbox portraits, so `news-image` must not crop.
    render(<RemoteImage src="https://i.test/a.jpg" alt="A" className="news-image rounded" />);
    const img = screen.getByTestId('next-image');
    expect(img).toHaveStyle({ objectFit: 'contain', objectPosition: 'center' });
  });

  it('lets an explicit fit win over the class heuristic', () => {
    render(<RemoteImage src="https://i.test/a.jpg" alt="A" className="news-image" fit="cover" />);
    expect(screen.getByTestId('next-image')).toHaveStyle({ objectFit: 'cover' });
  });

  it('leaves objectFit unset when neither a fit nor the class is present', () => {
    render(<RemoteImage src="https://i.test/a.jpg" alt="A" className="rounded" />);
    const img = screen.getByTestId('next-image');
    expect(img.style.objectFit).toBe('');
  });

  it('merges a caller style over the derived one', () => {
    render(<RemoteImage src="https://i.test/a.jpg" alt="A" className="news-image" style={{ opacity: 0.5 }} />);
    const img = screen.getByTestId('next-image');
    expect(img).toHaveStyle({ objectFit: 'contain', opacity: '0.5' });
  });

  it('wires the error handler so a broken image can fall back', async () => {
    const onError = jest.fn();
    render(<RemoteImage src="https://i.test/missing.jpg" alt="A" onError={onError} />);
    screen.getByTestId('next-image').dispatchEvent(new Event('error', { bubbles: false }));
    expect(onError).toHaveBeenCalled();
  });
});

describe('MatchCardCompact', () => {
  const base = { matchId: 'sr:match:1', teams: {}, tournament: 'PSL' };

  it('strips the sr:competitor: prefix from the team name', () => {
    render(<MatchCardCompact match={{ ...base, teams: { home: { name: 'sr:competitor:Lahore' } } }} />);
    expect(screen.getByText('Lahore')).toBeInTheDocument();
  });

  it('falls back to TBD when a side is unknown', () => {
    render(<MatchCardCompact match={base} />);
    expect(screen.getAllByText('TBD')).toHaveLength(2);
  });

  it('shows a two letter badge built from a short code', () => {
    render(
      <MatchCardCompact
        match={{ ...base, teams: { home: { name: 'Lahore Qalandars', code: 'LHR' } } }}
      />,
    );
    // The avatar only has room for two characters.
    expect(screen.getByText('LH')).toBeInTheDocument();
  });

  it('uses the official psl logo when the code matches a franchise', () => {
    render(
      <MatchCardCompact match={{ ...base, teams: { home: { name: 'Lahore Qalandars', code: 'LQA' } } }} />,
    );
    const img = screen.getByAltText('Lahore Qalandars');
    expect(img).toHaveAttribute('src', expect.stringContaining('lahore-qalandars'));
  });

  it('derives initials when the code is an unreadable provider id', () => {
    render(
      <MatchCardCompact
        match={{ ...base, teams: { home: { name: 'Islamabad United', code: 'sr:competitor:123456' } } }}
      />,
    );
    // A long or sr:-prefixed code is rejected, so initials are shown instead.
    expect(screen.queryByText(/sr:competitor/)).not.toBeInTheDocument();
    expect(screen.getByText('IU')).toBeInTheDocument();
  });

  it('reads the names from teamNames when there is no teams object', () => {
    render(<MatchCardCompact match={{ ...base, teams: undefined, teamNames: ['Karachi', 'Quetta'] }} />);
    expect(screen.getByText('Karachi')).toBeInTheDocument();
    expect(screen.getByText('Quetta')).toBeInTheDocument();
  });

  it('links to the match page', () => {
    render(<MatchCardCompact match={base} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/matches/sr:match:1');
  });

  it('falls back to the id when there is no matchId', () => {
    render(<MatchCardCompact match={{ id: 'm9', teams: {} }} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/matches/m9');
  });

  it('falls back to a generic heading when there is no tournament', () => {
    render(<MatchCardCompact match={{ matchId: 'm1', teams: {} }} />);
    expect(screen.getByText('Match')).toBeInTheDocument();
  });

  it('shows a raw date string when it cannot be parsed', () => {
    render(<MatchCardCompact match={{ ...base, scheduled: 'sometime' }} />);
    expect(screen.getByText('sometime')).toBeInTheDocument();
  });

  it('omits the date block entirely when nothing is scheduled', () => {
    const { container } = render(<MatchCardCompact match={base} />);
    expect(container.querySelector('.tabular-nums')).toBeNull();
  });
});
