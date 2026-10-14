import { render, screen } from '@testing-library/react';
import MobileBottomNav from '../components/MobileBottomNav';

let pathname = '/';
jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

beforeEach(() => {
  pathname = '/';
});

describe('MobileBottomNav', () => {
  it('shows exactly Home, Matches, Schedule, News plus Browse', () => {
    render(<MobileBottomNav />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const labels = [...nav.querySelectorAll('a,button')]
      .map((el) => el.textContent?.trim())
      .filter(Boolean);
    expect(labels).toEqual(['Home', 'Matches', 'Schedule', 'News', 'Browse']);
  });

  it('points each item at its canonical route', () => {
    render(<MobileBottomNav />);
    const hrefs = [...screen.getByRole('navigation').querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/', '/matches', '/schedules', '/news']);
  });

  it('no longer surfaces Predictions or Live in the bar itself', () => {
    render(<MobileBottomNav />);
    const nav = screen.getByRole('navigation');
    expect(nav.textContent).not.toMatch(/Predict/);
    expect(nav.textContent).not.toMatch(/\bLive\b/);
  });

  it('marks the active section for a match detail route', () => {
    pathname = '/matches/sr:match:123';
    render(<MobileBottomNav />);
    expect(screen.getByRole('link', { name: /Matches/i })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Schedule active on its own routes', () => {
    pathname = '/schedules';
    render(<MobileBottomNav />);
    expect(screen.getByRole('link', { name: /Schedule/i })).toHaveAttribute('aria-current', 'page');
  });

  it('marks News active for the Urdu news routes too', () => {
    pathname = '/ur/news';
    render(<MobileBottomNav />);
    expect(screen.getByRole('link', { name: /News/i })).toHaveAttribute('aria-current', 'page');
  });
});