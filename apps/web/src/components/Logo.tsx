'use client';

import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  to?: string;
  size?: string;
  priority?: boolean;
}

const imageClass: Record<string, string> = {
  sm: 'h-7 w-auto',
  md: 'h-8 w-auto',
  lg: 'h-11 w-auto',
  xl: 'h-12 w-auto',
};

/**
 * The artwork only occupies part of the 1536x1024 canvas, so the rendered box
 * is always wider than the visible mark by roughly 1.5x its height. These are
 * the CSS widths each preset produces at a 1x viewport.
 */
const imageSizes: Record<string, string> = {
  sm: '48px',
  md: '60px',
  lg: '96px',
  xl: '108px',
  footer: '(min-width: 1024px) 208px, (min-width: 640px) 176px, 144px',
};

/**
 * `logo.png` is a 1536x1024 canvas whose artwork only fills it from
 * x 120..1456 / y 163..843. Sizing the raw canvas therefore paints the mark at
 * ~66% of the box height with dead space around it, and a percentage width
 * (the old `w-1/2`) made the footer logo collapse on narrow viewports.
 *
 * The footer preset crops to the painted area instead: the link holds the
 * artwork aspect ratio and clips the overflow, while the image is scaled up
 * and shifted so the ink lands exactly on the visible edges. The offsets are
 * the canvas-to-artwork ratios of `logo.png` — width 1536/1337 and the left /
 * top padding expressed against the cropped box.
 */
const FOOTER_IMAGE_STYLE: React.CSSProperties = {
  width: '114.88%',
  height: 'auto',
  left: '-8.98%',
  top: '-23.94%',
};

export default function Logo({ to = '/', size = 'md', priority = false }: LogoProps) {
  const sizes = imageSizes[size] || imageSizes.md;

  if (size === 'footer') {
    return (
      <Link
        href={to}
        className="group relative block w-36 shrink-0 overflow-hidden sm:w-44 lg:w-52"
        style={{ aspectRatio: '1337 / 681' }}
        aria-label="PAK CRICZONE home"
      >
        <Image
          src="/brand/logo.png"
          alt=""
          width={1536}
          height={1024}
          sizes={sizes}
          className="absolute max-w-none object-contain"
          style={FOOTER_IMAGE_STYLE}
          preload={priority}
          quality={85}
        />
      </Link>
    );
  }

  return (
    <Link
      href={to}
      className="group inline-flex max-w-full shrink-0 items-center"
      aria-label="PAK CRICZONE home"
    >
      <Image
        src="/brand/logo.png"
        alt=""
        width={1536}
        height={1024}
        sizes={sizes}
        className={`${imageClass[size] || imageClass.md} max-w-full object-contain`}
        preload={priority}
        quality={85}
      />
    </Link>
  );
}
