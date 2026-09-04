'use client';

import React from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';

interface Ad {
  id: string;
  title: string;
  description: string;
  cta: string;
  gradient: string;
  borderColor: string;
}

const defaultAds: Ad[] = [
  {
    id: 'ad1',
    title: 'PSL 2026 Tickets',
    description: 'Get your tickets for the PSL 2026 playoffs. Limited seats available!',
    cta: 'Buy Now',
    gradient: 'from-accent/20 to-accent2/20',
    borderColor: 'ring-accent/30',
  },
  {
    id: 'ad2',
    title: 'Cricket Merchandise',
    description: 'Official PSL team jerseys, caps and accessories.',
    cta: 'Shop Now',
    gradient: 'from-gold/20 to-orange-500/20',
    borderColor: 'ring-gold/30',
  },
];

interface AdBannerProps {
  ads?: Ad[];
  variant?: string;
}

export default function AdBanner({ ads = defaultAds, variant = 'horizontal' }: AdBannerProps) {
  if (!ads || ads.length === 0) return null;

  if (variant === 'horizontal') {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ads.map((ad) => (
          <div
            key={ad.id}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${ad.gradient} p-5 ring-1 ${ad.borderColor} transition-all duration-300 hover:-translate-y-0.5`}
          >
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card/60 text-accent">
                <Megaphone size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stext">Sponsored</p>
                <h3 className="mt-1 text-base font-bold text-mtext">{ad.title}</h3>
                <p className="mt-1 text-sm text-stext">{ad.description}</p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-accent ring-1 ring-lborder transition-all hover:bg-elevated hover:text-accent2"
                >
                  {ad.cta} <ExternalLink size={12} />
                </button>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ads.map((ad) => (
        <div
          key={ad.id}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${ad.gradient} p-4 ring-1 ${ad.borderColor}`}
        >
          <div className="flex items-center gap-3">
            <Megaphone size={18} className="text-accent" />
            <div className="flex-1">
              <p className="text-xs font-bold text-mtext">{ad.title}</p>
              <p className="text-[11px] text-stext">{ad.description}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-card px-3 py-1.5 text-[11px] font-semibold text-accent ring-1 ring-lborder"
            >
              {ad.cta}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
