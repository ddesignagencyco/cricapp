'use client';

import { Heart, Shield, Target, Zap } from 'lucide-react';

const values = [
  {
    icon: Zap,
    title: 'Real-Time Coverage',
    text: 'Ball-by-ball updates, live scores and instant match alerts so you never miss a moment.',
  },
  {
    icon: Shield,
    title: 'Trusted Data',
    text: 'Accurate statistics, verified results and comprehensive player profiles you can rely on.',
  },
  {
    icon: Target,
    title: 'Deep Analysis',
    text: 'Expert match reports, tactical breakdowns and statistical insights beyond the surface.',
  },
  {
    icon: Heart,
    title: 'For Fans',
    text: 'Built by cricket lovers, for cricket lovers. Every feature designed with the fan experience in mind.',
  },
];

export function AboutValues() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {values.map((v) => (
        <div key={v.title} className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <v.icon size={20} />
          </div>
          <h3 className="text-base font-bold text-mtext">{v.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-stext">{v.text}</p>
        </div>
      ))}
    </div>
  );
}