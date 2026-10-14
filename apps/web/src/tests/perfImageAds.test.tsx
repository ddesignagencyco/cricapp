import { render } from '@testing-library/react';
import ResponsiveLeaderboard from '../components/advertisements/ResponsiveLeaderboard';
import RemoteImage from '../components/RemoteImage';

// Capture the props RemoteImage passes to next/image (the shared suite mock
// strips them), so routing through the optimizer is directly observable.
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { unoptimized, preload, ...rest } = props;
    return (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- test double capturing next/image props
      <img
        {...rest}
        data-unoptimized={unoptimized ? 'true' : 'false'}
        data-preload={preload ? 'true' : 'false'}
      />
    );
  },
}));

describe('ResponsiveLeaderboard (single-variant)', () => {
  it('renders exactly one creative image instead of one per breakpoint', () => {
    const { container } = render(<ResponsiveLeaderboard placement="home-mid" />);
    const region = container.querySelector('[data-ad-placement="home-mid"]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('aria-label', 'Advertisement');
    expect(container.querySelector('[data-ad-badge]')).not.toBeNull();
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', expect.stringContaining('Advertisement'));
  });
});

describe('RemoteImage optimizer routing', () => {
  it('routes trusted hosts through the Next.js optimizer', () => {
    const { container } = render(
      <RemoteImage
        src="https://psl-t20.com/wp-content/uploads/2016/01/psl-multan-sultan.png"
        alt="Multan"
        width={28}
        height={28}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('data-unoptimized', 'false');
    expect(img).toHaveAttribute('alt', 'Multan');
  });

  it('keeps an unoptimized passthrough for unknown hosts instead of breaking', () => {
    const src = 'https://unknown-cms.example.net/uploads/photo.png';
    const { container } = render(<RemoteImage src={src} alt="Photo" width={96} height={96} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(src);
    expect(img).toHaveAttribute('data-unoptimized', 'true');
    expect(img).toHaveAttribute('alt', 'Photo');
  });

  it('optimizes local images', () => {
    const { container } = render(<RemoteImage src="/brand/logo.png" alt="Logo" width={96} height={96} />);
    expect(container.querySelector('img')).toHaveAttribute('data-unoptimized', 'false');
  });

  it('defaults to quality 85 for crisp small images', () => {
    const { container } = render(<RemoteImage src="/brand/logo.png" alt="Logo" width={96} height={96} />);
    expect(container.querySelector('img')).toHaveAttribute('quality', '85');
  });

  it('forwards preload for the LCP candidate', () => {
    const { container } = render(
      <RemoteImage src="/brand/logo.png" alt="Logo" width={96} height={96} priority />,
    );
    expect(container.querySelector('img')).toHaveAttribute('data-preload', 'true');
  });
});
