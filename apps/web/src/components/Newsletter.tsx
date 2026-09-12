'use client';

import { Mail } from 'lucide-react';

export default function Newsletter() {
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
              disabled
              aria-label="Newsletter email"
              placeholder="Newsletter coming soon"
              className="min-w-0 flex-1 cursor-not-allowed rounded bg-primary px-4 py-2.5 text-sm text-stext ring-1 ring-lborder opacity-70 sm:w-64"
            />
            <button
              type="button"
              disabled
              className="shrink-0 cursor-not-allowed rounded bg-elevated px-5 py-2.5 text-sm font-medium text-stext opacity-70"
            >
              Coming soon
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
