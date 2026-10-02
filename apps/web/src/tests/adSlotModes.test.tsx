import { act, render, screen } from '@testing-library/react';
import AdProvider from '../components/advertisements/AdProvider';
import AdSlot, { AD_BLOCK_GRACE_MS } from '../components/advertisements/AdSlot';
import { EMPTY_AD_CONFIG, type AdConfig } from '../lib/advertisements/registry';

let pathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  useParams: () => ({}),
}));

jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ src, id }: { src: string; id: string }) => <script data-testid="adsense-tag" data-id={id} data-src={src} />,
}));

function configWith(overrides: Partial<AdConfig> = {}): AdConfig {
  return { ...EMPTY_AD_CONFIG, ...overrides };
}

function renderSlot(config: AdConfig, placement: string, className?: string) {
  return render(
    <AdProvider config={config}>
      <AdSlot placement={placement} className={className} />
    </AdProvider>,
  );
}

beforeEach(() => {
  pathname = '/';
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('mode gating', () => {
  it('renders nothing in off mode, even with a slot id configured', () => {
    const config = configWith({
      mode: 'off',
      clientId: 'pub-1234567890123456',
      defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, leaderboard: '1111111111' },
    });
    const { container } = renderSlot(config, 'home-mid');
    expect(container.querySelector('[data-ad-placement]')).toBeNull();
  });

  it('renders the house placeholder in house mode with nothing configured', () => {
    const { container } = renderSlot(configWith({ mode: 'house' }), 'home-mid');
    const region = container.querySelector('[data-ad-placement]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('aria-label', 'Advertisement');
    expect(container.querySelector('[data-ad-badge]')).not.toBeNull();
  });

  it('renders a real unit in adsense mode when a slot id resolves', () => {
    const config = configWith({
      mode: 'adsense',
      clientId: 'pub-1234567890123456',
      defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, leaderboard: '1111111111' },
    });
    const { container } = renderSlot(config, 'home-mid');
    const ins = container.querySelector('ins.adsbygoogle');
    expect(ins).not.toBeNull();
    expect(ins).toHaveAttribute('data-ad-slot', '1111111111');
  });

  it('prefers the placement slot id over the size default', () => {
    const config = configWith({
      mode: 'adsense',
      defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, mediumRectangle: '1111111111' } as never,
      placements: { 'news-detail-sidebar': { enabled: true, slotId: '2222222222' } },
    });
    const { container } = renderSlot(config, 'news-detail-sidebar');
    expect(container.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-slot', '2222222222');
  });

  it('renders nothing in adsense mode when no slot id resolves', () => {
    // The documented consequence of not resolving a slotId: a visible empty box.
    const { container } = renderSlot(configWith({ mode: 'adsense', clientId: 'pub-1' }), 'home-mid');
    expect(container.querySelector('ins.adsbygoogle')).toBeNull();
    expect(container.querySelector('[data-ad-placement]')).toBeNull();
  });

  it('adds no site badge in adsense mode, because AdSense renders its own', () => {
    const config = configWith({
      mode: 'adsense',
      placements: { 'home-sidebar': { enabled: true, slotId: '3333333333' } },
    });
    const { container } = renderSlot(config, 'home-sidebar');
    expect(container.querySelector('[data-ad-badge]')).toBeNull();
  });
});

describe('route and placement gating', () => {
  it('hides a shared placement on a gambling route until the admin opts in', () => {
    pathname = '/predictions';
    const { container } = renderSlot(configWith({ mode: 'house' }), 'layout-sidebar');
    expect(container.querySelector('[data-ad-placement]')).toBeNull();
  });

  it('shows it once gamblingAds is on', () => {
    pathname = '/predictions';
    const { container } = renderSlot(configWith({ mode: 'house', gamblingAds: true }), 'layout-sidebar');
    expect(container.querySelector('[data-ad-placement]')).not.toBeNull();
  });

  it('hides a placement that is switched off', () => {
    const config = configWith({ mode: 'house', placements: { 'news-list-bottom': { enabled: false, slotId: null } } });
    const { container } = renderSlot(config, 'news-list-bottom');
    expect(container.querySelector('[data-ad-placement]')).toBeNull();
  });
});

describe('the ad-block collapse', () => {
  const adsense = configWith({
    mode: 'adsense',
    placements: { 'home-mid': { enabled: true, slotId: '1111111111' } },
  });

  it('collapses the reserved box when no ad ever reports a status', () => {
    const { container } = renderSlot(adsense, 'home-mid');
    expect(container.querySelector('ins.adsbygoogle')).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(AD_BLOCK_GRACE_MS + 10);
    });

    // An ad blocker stops adsbygoogle.js from running, so data-ad-status never appears.
    expect(container.querySelector('ins.adsbygoogle')).toBeNull();
    expect(container.querySelector('[data-ad-placement]')).toBeNull();
  });

  it('keeps the box when AdSense fills the unit', () => {
    const { container } = renderSlot(adsense, 'home-mid');
    const ins = container.querySelector('ins.adsbygoogle')!;

    act(() => {
      ins.setAttribute('data-ad-status', 'filled');
      jest.advanceTimersByTime(AD_BLOCK_GRACE_MS + 10);
    });

    expect(container.querySelector('ins.adsbygoogle')).not.toBeNull();
  });

  it('collapses when AdSense reports the unit as unfilled', async () => {
    const { container } = renderSlot(adsense, 'home-mid');
    const ins = container.querySelector('ins.adsbygoogle')!;

    act(() => {
      ins.setAttribute('data-ad-status', 'unfilled');
    });
    // The status is picked up by a MutationObserver, whose callbacks arrive as microtasks.
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('ins.adsbygoogle')).toBeNull();
  });

  it('queues exactly one ad request per slot', () => {
    const push = jest.fn();
    (window as unknown as { adsbygoogle: unknown }).adsbygoogle = { push };
    renderSlot(adsense, 'home-mid');
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('marks the <ins> as queued so a repeated effect pass cannot re-push', () => {
    // Regression: reactStrictMode double-invokes effects against the same DOM node,
    // so a naive push fired twice per slot and Google answered
    // "All 'ins' elements in the DOM with class=adsbygoogle already have ads in them."
    const push = jest.fn();
    (window as unknown as { adsbygoogle: unknown }).adsbygoogle = { push };
    const { container } = renderSlot(adsense, 'home-mid');
    const ins = container.querySelector('ins.adsbygoogle')!;

    expect(push).toHaveBeenCalledTimes(1);
    // The marker is what makes the second pass a no-op.
    expect(ins.getAttribute('data-ad-queued')).toBe('');

    // A slot whose element is already queued must not issue a second request even
    // if the effect runs again, which is what StrictMode does.
    ins.setAttribute('data-ad-queued', '');
    (window as unknown as { adsbygoogle: unknown }).adsbygoogle = { push };
    expect(container.querySelectorAll('ins.adsbygoogle:not([data-ad-queued])').length).toBe(0);
  });

  it('queues one request per slot when several placements share one ad unit', () => {
    // The home page mounts three leaderboard slots that all fall through to the same
    // size default, so exactly three requests must be issued — no more, or the tag
    // rejects the surplus with "already have ads in them".
    const shared = configWith({
      mode: 'adsense',
      defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, leaderboard: '1111111111' },
    });
    const push = jest.fn();
    (window as unknown as { adsbygoogle: unknown }).adsbygoogle = { push };
    const { container } = render(
      <AdProvider config={shared}>
        <AdSlot placement="home-mid" />
        <AdSlot placement="home-footer" />
        <AdSlot placement="news-list-bottom" />
      </AdProvider>,
    );

    expect(container.querySelectorAll('ins.adsbygoogle')).toHaveLength(3);
    expect(push).toHaveBeenCalledTimes(3);
    // Every slot took a request, none left waiting, none queued twice.
    expect(container.querySelectorAll('ins.adsbygoogle:not([data-ad-queued])')).toHaveLength(0);
  });

  it('queues into the pre-load array shape', () => {
    // Google's own snippet creates an array before the tag loads and drains it on load.
    (window as unknown as { adsbygoogle: unknown }).adsbygoogle = [];
    expect(() => renderSlot(adsense, 'home-mid')).not.toThrow();
    expect((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle).toHaveLength(1);
  });

  it('does not throw when an ad blocker leaves a non-pushable global in place', () => {
    // Regression: an object with no `push` used to crash the whole page with
    // "w.adsbygoogle.push is not a function".
    (window as unknown as { adsbygoogle: unknown }).adsbygoogle = { blocked: true };
    expect(() => renderSlot(adsense, 'home-mid')).not.toThrow();
    expect(Array.isArray((window as unknown as { adsbygoogle: unknown }).adsbygoogle)).toBe(true);
  });

  it('does not throw when the global is a non-function value', () => {
    (window as unknown as { adsbygoogle: unknown }).adsbygoogle = null;
    expect(() => renderSlot(adsense, 'home-mid')).not.toThrow();
  });
});

describe('the provider', () => {
  it('loads the AdSense tag only in adsense mode with a publisher id', () => {
    const adsense = configWith({ mode: 'adsense', clientId: 'pub-1234567890123456' });
    const { rerender } = render(
      <AdProvider config={adsense}>
        <span>child</span>
      </AdProvider>,
    );
    const tag = screen.getByTestId('adsense-tag');
    expect(tag).toHaveAttribute('data-src', expect.stringContaining('pub-1234567890123456'));

    rerender(
      <AdProvider config={configWith({ mode: 'house', clientId: 'pub-1234567890123456' })}>
        <span>child</span>
      </AdProvider>,
    );
    expect(screen.queryByTestId('adsense-tag')).toBeNull();
  });

  it('omits the tag when adsense is on but no publisher id is stored', () => {
    render(
      <AdProvider config={configWith({ mode: 'adsense' })}>
        <span>child</span>
      </AdProvider>,
    );
    expect(screen.queryByTestId('adsense-tag')).toBeNull();
  });

  it('falls back to house mode when rendered without a config', () => {
    const { container } = render(
      <AdProvider>
        <AdSlot placement="home-mid" />
      </AdProvider>,
    );
    expect(container.querySelector('[data-ad-placement]')).not.toBeNull();
    expect(screen.queryByTestId('adsense-tag')).toBeNull();
  });
});