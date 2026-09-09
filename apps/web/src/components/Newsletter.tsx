'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-accent/15 via-card to-accent2/10 ring-1 ring-lborder">
        <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent sm:h-12 sm:w-12">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-mtext sm:text-lg">Stay Ahead of the Game</h3>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-stext sm:text-sm">
                Get the latest cricket news, match updates and exclusive stories straight to your inbox.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="min-w-0 flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder placeholder:text-stext/60 focus:outline-none focus:ring-2 focus:ring-accent/50 sm:w-64"
            />
            <button
              type="button"
              className="shrink-0 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent2"
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
