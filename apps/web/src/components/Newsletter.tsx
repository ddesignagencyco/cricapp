'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="overflow-hidden rounded-xl bg-gradient-to-r from-accent/10 via-card to-accent2/10 ring-1 ring-lborder">
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-mtext">Stay Ahead of the Game</h3>
              <p className="mt-0.5 text-sm text-stext">
                Get the latest cricket news, match updates and exclusive stories straight to your inbox.
              </p>
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder placeholder:text-stext/60 focus:outline-none focus:ring-2 focus:ring-accent/50 sm:w-64"
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
