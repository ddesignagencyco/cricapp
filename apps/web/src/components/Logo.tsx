'use client';

import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  to?: string;
  size?: string;
  /** Use on light surfaces (e.g. footer): full logo image filling the parent width */
  tone?: 'default' | 'on-light';
}

// const MARK = {
//   sm: 26,
//   md: 30,
//   lg: 36,
// } as const;

const imageClass: Record<string, string> = {
  sm: 'h-7 w-auto',
  md: 'h-8 w-auto',
  lg: 'h-11 w-auto',
  xl: 'h-12 w-auto',
  '4xl': 'h-20 w-auto',
};

export default function Logo({ to = '/', size = 'md', tone = 'default' }: LogoProps) {
  const imgSize = imageClass[size] || imageClass.md;

  if (tone === 'on-light') {
    return (
      <Link
        href={to}
        className="group block shrink-0 whitespace-nowrap"
        aria-label="PAK CRICZONE home"
      >
        <Image
          src="/brand/logo.png"
          alt=""
          width={1536}
          height={1024}
          className="h-auto w-1/2 object-contain"
          priority
        />
      </Link>
    );
  }

  return (
    <Link href={to} className="group inline-flex shrink-0 items-center gap-2 whitespace-nowrap" aria-label="PAK CRICZONE home">
      <Image
        src="/brand/logo.png"
        alt=""
        width={120}
        height={100}
        className={`${imgSize} shrink-0 object-contain`}
        priority
      />
    </Link>
  );
}
