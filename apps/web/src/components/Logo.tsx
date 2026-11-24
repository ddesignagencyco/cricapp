'use client';

import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  to?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'footer' | string;
  priority?: boolean;
  /**
   * 'auto' switches between white-ink (dark mode) and navy-ink (light mode).
   * 'dark' forces white-ink for permanently dark surfaces (admin sidebar, hero overlays).
   * 'light' forces navy-ink for permanently light surfaces.
   * 'icon' renders the square app icon (ideal for collapsed 72px rails).
   */
  variant?: 'auto' | 'dark' | 'light' | 'icon';
}

const imageClass: Record<string, string> = {
  sm: 'h-8 w-auto',
  md: 'h-9 w-auto',
  lg: 'h-11 w-auto sm:h-12 lg:h-[48px]',
  xl: 'h-12 w-auto sm:h-14',
  footer: 'h-12 w-auto sm:h-14',
};

const imageSizes: Record<string, string> = {
  sm: '120px',
  md: '140px',
  lg: '190px',
  xl: '210px',
  footer: '(min-width: 640px) 220px, 180px',
};

export default function Logo({
  to = '/',
  size = 'md',
  priority = false,
  variant = 'auto',
}: LogoProps) {
  const cls = `${imageClass[size] || imageClass.md} max-w-full object-contain`;
  const sizes = imageSizes[size] || imageSizes.md;

  if (variant === 'icon') {
    return (
      <Link
        href={to}
        className="group inline-flex shrink-0 items-center justify-center"
        aria-label="CriczApp home"
      >
        <Image
          src="/brand/favicon.png"
          alt="CriczApp"
          width={256}
          height={256}
          sizes="40px"
          className="h-9 w-9 rounded-lg object-contain"
          priority={priority}
          quality={90}
        />
      </Link>
    );
  }

  if (variant === 'dark') {
    return (
      <Link
        href={to}
        className="group inline-flex max-w-full shrink-0 items-center"
        aria-label="CriczApp home"
      >
        <Image
          src="/brand/logo-dark.png"
          alt="CriczApp"
          width={1200}
          height={340}
          sizes={sizes}
          className={cls}
          priority={priority}
          quality={90}
        />
      </Link>
    );
  }

  if (variant === 'light') {
    return (
      <Link
        href={to}
        className="group inline-flex max-w-full shrink-0 items-center"
        aria-label="CriczApp home"
      >
        <Image
          src="/brand/logo-light.png"
          alt="CriczApp"
          width={1200}
          height={340}
          sizes={sizes}
          className={cls}
          priority={priority}
          quality={90}
        />
      </Link>
    );
  }

  return (
    <Link
      href={to}
      className="group inline-flex max-w-full shrink-0 items-center"
      aria-label="CriczApp home"
    >
      <Image
        src="/brand/logo-dark.png"
        alt="CriczApp"
        width={1200}
        height={340}
        sizes={sizes}
        className={`logo-img--dark ${cls}`}
        priority={priority}
        quality={90}
      />
      <Image
        src="/brand/logo-light.png"
        alt="CriczApp"
        width={1200}
        height={340}
        sizes={sizes}
        className={`logo-img--light ${cls}`}
        priority={priority}
        quality={90}
      />
    </Link>
  );
}
