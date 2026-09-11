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

export default function Logo({ to = '/', size = 'md' }: LogoProps) {
  // const px = MARK[size as keyof typeof MARK] || MARK.md;
  // const textSize = size === 'lg' ? 'text-xl sm:text-2xl' : 'text-xl';
  return (
    <Link href={to} className="group flex shrink-0 items-center gap-2 whitespace-nowrap" aria-label="PAK CRICZONE home">
      <Image
        src="/brand/logo.png"
        alt=""
        width={120}
        height={100}
        className="shrink-0 object-contain"
        priority
      />
      {/* <span className={`${textSize} font-black tracking-tight`}>
        <span className="text-mtext">PAK CRIC</span>
        <span className="text-accent">ZONE</span>
      </span> */}
    </Link>
  );
}
