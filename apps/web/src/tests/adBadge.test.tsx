import { render, screen } from '@testing-library/react';
import HouseAd from '../components/advertisements/HouseAd';

/** The label a reader needs in order to know a placement is paid, not editorial. */
function badgeIn(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-ad-badge]');
}

describe('the advertisement label', () => {
  it('marks a responsive leaderboard', () => {
    const { container } = render(<HouseAd size="leaderboard" placement="home-top" />);
    expect(badgeIn(container)).not.toBeNull();
    expect(badgeIn(container)?.textContent).toBe('Ad');
  });

  it('marks a rectangle placement', () => {
    const { container } = render(<HouseAd size="medium-rectangle" placement="sidebar" />);
    expect(badgeIn(container)).not.toBeNull();
  });

  it('marks an in-feed placement', () => {
    const { container } = render(<HouseAd size="large-rectangle" placement="feed" inFeed />);
    expect(badgeIn(container)).not.toBeNull();
  });

  it('marks every leaderboard size, including the in-feed leaderboard', () => {
    const { container } = render(<HouseAd size="leaderboard" placement="feed" inFeed />);
    expect(badgeIn(container)).not.toBeNull();
  });

  it('sits in the top-right corner, on the right like the match status badges', () => {
    for (const props of [
      { size: 'leaderboard' as const, placement: 'home-top' },
      { size: 'medium-rectangle' as const, placement: 'sidebar' },
      { size: 'large-rectangle' as const, placement: 'feed', inFeed: true },
    ]) {
      const { container, unmount } = render(<HouseAd {...props} />);
      const badge = badgeIn(container);
      expect(badge).not.toBeNull();
      expect(badge?.className).toContain('right-2');
      expect(badge?.className).toContain('top-2');
      unmount();
    }
  });

  it('is anchored to the placement, so the corner is the ad corner', () => {
    const { container } = render(<HouseAd size="medium-rectangle" placement="sidebar" />);
    const region = container.querySelector('[data-ad-placement]');
    expect(region).not.toBeNull();
    expect(region?.className).toContain('relative');
    // The badge is a child of the placement, not a sibling floating above the page.
    expect(badgeIn(container)?.parentElement).toBe(region);
  });

  it('overlays the creative rather than taking layout space from it', () => {
    const { container } = render(<HouseAd size="medium-rectangle" placement="sidebar" />);
    const badge = badgeIn(container);
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('absolute');
    // The creative keeps the full slot size.
    const frame = container.querySelector('img, video');
    expect(frame).not.toBeNull();
  });

  it('is not repeated per leaderboard breakpoint', () => {
    // Four responsive variants are stacked and only one is shown, so one label is enough.
    const { container } = render(<HouseAd size="leaderboard" placement="home-top" />);
    expect(container.querySelectorAll('[data-ad-badge]')).toHaveLength(1);
  });

  it('keeps the region label for assistive tech without saying it twice', () => {
    render(<HouseAd size="medium-rectangle" placement="sidebar" />);
    const region = screen.getByLabelText('Advertisement');
    expect(region).toBeInTheDocument();
    expect(region.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('uses the same shared badge the match cards use for Live / Completed', () => {
    const { container } = render(<HouseAd size="medium-rectangle" placement="sidebar" />);
    // `Badge` renders a pill; `StatusBadge` on a match card renders the same element.
    expect(badgeIn(container)?.querySelector('span span')).not.toBeNull();
  });
});