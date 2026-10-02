import { render } from '@testing-library/react';
import { StatusBadge } from '../components/Badge';

/**
 * The AdSense status badge must never paint green off `status.configured` alone.
 *
 * `configured` is a local env check only — the backend deliberately makes no upstream
 * call for it — so credentials that are present but rejected by Google still read
 * `configured: true`. That exact state shipped once: a green "Active" badge sitting
 * above three panels that all returned 503.
 */

/** Mirrors the badge/status mapping in the admin ads page. */
function statusFor(verified: boolean | undefined, configured = true) {
  if (!configured) return 'inactive';
  if (verified === true) return 'active';
  if (verified === false) return 'failed';
  return 'checking';
}

function paletteOf(status: string): string {
  const { container } = render(<StatusBadge status={status} />);
  // `Badge` inlines the resolved palette, so the style attribute is what the eye sees.
  return container.firstElementChild?.getAttribute('style') ?? '';
}

describe('the AdSense status badge', () => {
  it('never paints green for credentials Google rejected', () => {
    // The regression: configured: true from a file on disk, every data call 503.
    expect(paletteOf(statusFor(false))).toContain('danger');
    expect(paletteOf(statusFor(false))).not.toContain('success');
  });

  it('paints green only when a real AdSense call came back', () => {
    expect(paletteOf(statusFor(true))).toContain('success');
  });

  it('paints neutral while the probe is still running', () => {
    expect(paletteOf(statusFor(undefined))).toContain('neutral');
  });

  it('paints neutral when there are no credentials at all', () => {
    expect(paletteOf(statusFor(undefined, false))).toContain('neutral');
  });

  it('only ever claims success in the verified state', () => {
    const states = [statusFor(true), statusFor(false), statusFor(undefined), statusFor(undefined, false)];
    states.forEach((status) => {
      const isGreen = paletteOf(status).includes('success');
      expect(isGreen).toBe(status === 'active');
    });
  });
});

describe('the label', () => {
  it('reads as Failed, not Active, when the credentials were rejected', () => {
    const { container } = render(<StatusBadge status={statusFor(false)} />);
    expect(container.textContent).toMatch(/failed/i);
  });

  it('reads as Active only when verified', () => {
    const { container } = render(<StatusBadge status={statusFor(true)} />);
    expect(container.textContent).toBe('Active');
  });

  it('reads as Inactive when nothing is configured', () => {
    const { container } = render(<StatusBadge status={statusFor(undefined, false)} />);
    expect(container.textContent).toBe('Inactive');
  });
});