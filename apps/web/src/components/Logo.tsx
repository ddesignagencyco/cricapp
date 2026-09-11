'use client';

import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  to?: string;
  size?: string;
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

export default function Logo({ to = '/', size = 'md' }: LogoProps) {
  return (
    <Link href={to} className="group flex h-full shrink-0 items-center gap-2 whitespace-nowrap" aria-label="PAK CRICZONE home">
      <Image
        src="/brand/logo.png"
        alt=""
        width={120}
        height={100}
        className={`${imageClass[size] || imageClass.md} shrink-0 object-contain`}
        priority
      />
      {/* <span className={`${textSize} font-black tracking-tight`}>
        <span className="text-mtext">PAK CRIC</span>
        <span className="text-accent">ZONE</span>
      </span> */}
    </Link>
  );
}
