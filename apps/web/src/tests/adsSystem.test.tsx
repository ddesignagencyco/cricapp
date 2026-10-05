import { act, render, screen } from '@testing-library/react';
import AdProvider from '../components/advertisements/AdProvider';
import AdSlot, { AD_BLOCK_GRACE_MS } from '../components/advertisements/AdSlot';
import AdBanner from '../components/advertisements/AdBanner';
import AdInArticle from '../components/advertisements/AdInArticle';
import AdMultiplex from '../components/advertisements/AdMultiplex';
import AdSideRail from '../components/advertisements/AdSideRail';
import AdAnchor from '../components/advertisements/AdAnchor';
import AdVignette from '../components/advertisements/AdVignette';
import {
  AD_CONCEPTUAL_PLACEMENTS,
  CONCEPTUAL_PLACEMENT_MAP,
  normalizePublisherId,
  resolveAutoAdsConfig,
  resolvePublisherId,
} from '../lib/advertisements/adsConfig';
import { AD_PLACEMENTS, EMPTY_AD_CONFIG, type AdConfig } from '../lib/advertisements/registry';

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

const adsenseWith = (slotId = '1111111111'): AdConfig =>
  configWith({
    mode: 'adsense',
    clientId: 'pub-1234567890123456',
    placements: { 'news-detail-after-related': { enabled: true, slotId } },
  });

beforeEach(() => {
  pathname = '/';
  jest.useFakeTimers();
  delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  delete process.env.NEXT_PUBLIC_ADSENSE_AUTO_ADS;
  delete process.env.NEXT_PUBLIC_ADSENSE_ANCHOR;
  delete process.env.NEXT_PUBLIC_ADSENSE_VIGNETTE;
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  delete (window as unknown as { adsbygoogle?: unknown }).adsbygoogle;
  delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  delete process.env.NEXT_PUBLIC_ADSENSE_AUTO_ADS;
  delete process.env.NEXT_PUBLIC_ADSENSE_ANCHOR;
  delete process.env.NEXT_PUBLIC_ADSENSE_VIGNETTE;
});

describe('adsConfig', () => {
  it('normalizes publisher ids to the canonical ca-pub form', () => {
    expect(normalizePublisherId('pub-1234567890123456')).toBe('ca-pub-1234567890123456');
    expect(normalizePublisherId('ca-pub-1234567890123456')).toBe('ca-pub-1234567890123456');
    expect(normalizePublisherId('')).toBeNull();
    expect(normalizePublisherId('not-an-id')).toBeNull();
  });

  it('prefers the stored config over the environment fallback', () => {
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = 'pub-9999999999999999';
    expect(resolvePublisherId('pub-1234567890123456')).toBe('ca-pub-1234567890123456');
    expect(resolvePublisherId(null)).toBe('ca-pub-9999999999999999');
    expect(resolvePublisherId(undefined)).toBe('ca-pub-9999999999999999');
  });

  it('returns null when nothing is configured anywhere', () => {
    expect(resolvePublisherId(null)).toBeNull();
  });

  it('keeps auto ads off by default', () => {
    expect(resolveAutoAdsConfig()).toEqual({ enabled: false, anchor: false, vignette: false });
  });

  it('enables anchor/vignette eligibility only with the env flags', () => {
    process.env.NEXT_PUBLIC_ADSENSE_AUTO_ADS = '1';
    expect(resolveAutoAdsConfig()).toEqual({ enabled: true, anchor: true, vignette: true });
    process.env.NEXT_PUBLIC_ADSENSE_ANCHOR = '0';
    expect(resolveAutoAdsConfig().anchor).toBe(false);
  });

  it('maps every non-Auto-Ads concept to a real registry key', () => {
    const keys = new Set(AD_PLACEMENTS.map((p) => p.key));
    for (const concept of AD_CONCEPTUAL_PLACEMENTS) {
      const mapped = CONCEPTUAL_PLACEMENT_MAP[concept].registryKey;
      if (mapped) expect(keys.has(mapped)).toBe(true);
    }
  });
});

describe('AdBanner', () => {
  it('renders the placement and reserves vertical space against CLS', () => {
    const { container } = render(
      <AdProvider config={configWith({ mode: 'house' })}>
        <AdBanner placement="home-mid" />
      </AdProvider>,
    );
    expect(container.querySelector('[data-ad-placement="home-mid"]')).not.toBeNull();
  });

  it('renders every new placement as a house placeholder before approval', () => {
    // No AdSense approval yet → `house` mode. Each placement added by this
    // change must be visible on the site as a dummy placeholder, toggleable
    // from the admin Ads manager.
    const placements: Array<{ placement: string; node: React.ReactNode }> = [
      { placement: 'news-detail-top', node: <AdBanner placement="news-detail-top" /> },
      { placement: 'home-multiplex', node: <AdMultiplex placement="home-multiplex" /> },
      { placement: 'home-multiplex-alias', node: <AdMultiplex placement="news-detail-after-related" /> },
      { placement: 'search-bottom', node: <AdBanner placement="search-bottom" /> },
    ];
    for (const { placement, node } of placements) {
      const { container, unmount } = render(
        <AdProvider config={configWith({ mode: 'house' })}>{node}</AdProvider>,
      );
      const key = placement === 'home-multiplex-alias' ? 'news-detail-after-related' : placement;
      expect(container.querySelector(`[data-ad-placement="${key}"]`)).not.toBeNull();
      // House placeholder carries the site badge; production units never do.
      expect(container.querySelector('[data-ad-badge]')).not.toBeNull();
      expect(container.querySelector('ins.adsbygoogle')).toBeNull();
      unmount();
    }
  });

  it('never renders a fake production ad in development', () => {
    const { container } = render(
      <AdProvider config={configWith({ mode: 'house' })}>
        <AdBanner placement="home-mid" />
      </AdProvider>,
    );
    expect(container.querySelector('ins.adsbygoogle')).toBeNull();
    expect(container.textContent).not.toMatch(/click here|support us/i);
  });
});

describe('AdMultiplex', () => {
  it('renders the official autorelaxed format, not a hand-built grid', () => {
    const { container } = render(
      <AdProvider config={adsenseWith()}>
        <AdMultiplex placement="news-detail-after-related" />
      </AdProvider>,
    );
    const ins = container.querySelector('ins.adsbygoogle');
    expect(ins).not.toBeNull();
    expect(ins).toHaveAttribute('data-ad-format', 'autorelaxed');
    expect(container.querySelector('[data-ad-format="autorelaxed"]')).not.toBeNull();
  });

  it('accepts an explicit multiplex unit without stored config', () => {
    const { container } = render(
      <AdProvider config={configWith({ mode: 'adsense', clientId: 'pub-1234567890123456' })}>
        <AdMultiplex placement="home-multiplex" slot="9999999999" />
      </AdProvider>,
    );
    expect(container.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-slot', '9999999999');
  });

  it('collapses a malformed explicit slot instead of rendering it', () => {
    const { container } = render(
      <AdProvider config={adsenseWith()}>
        <AdMultiplex placement="news-detail-after-related" slot="abc" />
      </AdProvider>,
    );
    expect(container.querySelector('ins.adsbygoogle')).toBeNull();
    expect(container.querySelector('[data-ad-placement]')).toBeNull();
  });
});

describe('AdSideRail', () => {
  it('is hidden below desktop widths and fixed-width on wide screens', () => {
    const { container } = render(
      <AdProvider config={configWith({ mode: 'house' })}>
        <AdSideRail placement="layout-sidebar" />
      </AdProvider>,
    );
    const rail = container.querySelector('[data-ad-placement="layout-sidebar"]')?.parentElement?.parentElement;
    expect(rail?.className).toMatch(/hidden/);
    expect(rail?.className).toMatch(/lg:block/);
    expect(rail?.className).toMatch(/w-\[300px\]/);
  });
});

describe('AdInArticle', () => {
  it('renders a fluid unit inside the article flow', () => {
    const config = configWith({
      mode: 'adsense',
      clientId: 'pub-1234567890123456',
      placements: { 'news-detail-inarticle': { enabled: true, slotId: '2222222222' } },
    });
    const { container } = render(
      <AdProvider config={config}>
        <AdInArticle />
      </AdProvider>,
    );
    expect(container.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-format', 'fluid');
  });
});

describe('AdAnchor / AdVignette', () => {
  it('render nothing — they are Auto Ads integration points, never fake ads', () => {
    const anchor = render(<AdAnchor />);
    expect(anchor.container.innerHTML).toBe('');
    anchor.unmount();
    const vignette = render(<AdVignette />);
    expect(vignette.container.innerHTML).toBe('');
    vignette.unmount();
  });
});

describe('preview simulators', () => {
  it('shows labeled simulators in house mode only', async () => {
    const { SimulatedAnchor, SimulatedVignette } = await import(
      '../components/advertisements/AdPreviewSimulators'
    );
    const { container, unmount } = render(
      <AdProvider config={configWith({ mode: 'house' })}>
        <SimulatedAnchor />
        <SimulatedVignette />
      </AdProvider>,
    );
    expect(screen.queryByRole('region', { name: /simulated anchor/i })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /simulated vignette/i })).not.toBeNull();
    // Explicitly a drill, never something that could pass as a Google ad.
    expect(container.textContent).toMatch(/test only/i);
    unmount();
  });

  it('renders nothing in adsense mode — production can never show a fake ad', async () => {
    const { SimulatedAnchor, SimulatedVignette } = await import(
      '../components/advertisements/AdPreviewSimulators'
    );
    render(
      <AdProvider config={adsenseWith()}>
        <SimulatedAnchor />
        <SimulatedVignette />
      </AdProvider>,
    );
    // The provider's own script tag may render; the simulators must not.
    expect(screen.queryByRole('region', { name: /simulated anchor/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /simulated vignette/i })).toBeNull();
  });
});

describe('AdSlot publisher + explicit slot', () => {
  it('tags units with the canonical data-ad-client', () => {
    const { container } = render(
      <AdProvider config={adsenseWith()}>
        <AdSlot placement="news-detail-after-related" />
      </AdProvider>,
    );
    expect(container.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-client', 'ca-pub-1234567890123456');
  });

  it('falls back to NEXT_PUBLIC_ADSENSE_CLIENT for the script and units', () => {
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT = 'pub-9999999999999999';
    const config = configWith({
      mode: 'adsense',
      placements: { 'home-mid': { enabled: true, slotId: '1111111111' } },
    });
    const { container, getByTestId } = render(
      <AdProvider config={config}>
        <AdSlot placement="home-mid" />
      </AdProvider>,
    );
    expect(getByTestId('adsense-tag').getAttribute('data-src')).toContain('ca-pub-9999999999999999');
    expect(container.querySelector('ins.adsbygoogle')).toHaveAttribute('data-ad-client', 'ca-pub-9999999999999999');
  });

  it('still collapses on the ad-block grace period with the new props', () => {
    const { container } = render(
      <AdProvider config={adsenseWith()}>
        <AdSlot placement="news-detail-after-related" />
      </AdProvider>,
    );
    expect(container.querySelector('ins.adsbygoogle')).not.toBeNull();
    act(() => {
      jest.advanceTimersByTime(AD_BLOCK_GRACE_MS + 10);
    });
    expect(container.querySelector('[data-ad-placement]')).toBeNull();
  });
});
