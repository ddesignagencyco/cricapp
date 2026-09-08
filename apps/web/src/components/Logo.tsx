'use client';

import Link from 'next/link';

interface LogoProps {
  to?: string;
  size?: string;
}

export default function Logo({ to = '/', size = 'md' }: LogoProps) {
  const textSize = size === 'lg' ? 'text-2xl' : 'text-xl';
  return (
    <Link href={to} className="group flex items-center gap-2.5" aria-label="PAK CRICZONE home">
      <span className={`${textSize} font-black tracking-tight`}>
        <span className="text-mtext">PAK CRIC</span>
        <span className="text-accent">ZONE</span>
      </span>
    </Link>
  );
}
