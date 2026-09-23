'use client';

import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  to?: string;
  size?: string;
  /** Use on light surfaces (e.g. footer): icon mark + brand-blue wordmark instead of full PNG text */
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
  lg: 'h-9 w-auto',
  xl: 'h-12 w-auto',
};

const iconClipClass: Record<string, string> = {
  sm: 'h-7 w-[1.85rem]',
  md: 'h-8 w-[2.1rem]',
  lg: 'h-9 w-[2.35rem]',
  xl: 'h-12 w-[3.1rem]',
};

const wordmarkClass: Record<string, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

export default function Logo({ to = '/', size = 'md', tone = 'default' }: LogoProps) {
  const imgSize = imageClass[size] || imageClass.md;

  if (tone === 'on-light') {
    const clip = iconClipClass[size] || iconClipClass.md;
    const word = wordmarkClass[size] || wordmarkClass.md;
    return (
      <Link
        href={to}
        className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
        aria-label="PAK CRICZONE home"
      >
        <span className={`relative shrink-0 overflow-hidden ${clip}`} aria-hidden>
          <Image
            src="/brand/logo.png"
            alt=""
            width={120}
            height={100}
            className={`${imgSize} max-w-none object-contain object-left`}
            priority
          />
        </span>
        <span className={`${word} font-black italic leading-none tracking-tight text-brand`}>PCZ</span>
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
