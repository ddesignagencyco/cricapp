'use client';

import Link from 'next/link';

interface LogoProps {
  to?: string;
  size?: string;
}

export default function Logo({ to = '/', size = 'md' }: LogoProps) {
  const iconSize = size === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
  const textSize = size === 'lg' ? 'text-2xl' : 'text-xl';
  return (
    <Link href={to} className="group flex items-center gap-2.5" aria-label="PAK CRICZONE home">
      <span className={`${iconSize} grid place-items-center rounded-full border-2 border-accent bg-primary`}>
        <svg width="70%" height="70%" viewBox="0 0 32 32" fill="none">
          <path d="M16 4c6 6 5 12 0 14-5-2-6-8 0-14z" fill="#00C2FF" />
          <circle cx="21" cy="22" r="2" fill="#F5F7FA" />
          <circle cx="11" cy="25" r="1.4" fill="#00E676" />
        </svg>
      </span>
      <span className={`${textSize} font-black tracking-tight`}>
        <span className="text-mtext">PAK CRIC</span>
        <span className="text-accent">ZONE</span>
      </span>
    </Link>
  );
}
