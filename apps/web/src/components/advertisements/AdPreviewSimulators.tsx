'use client';

import { useState } from 'react';
import { useAdConfig } from './AdProvider';

/**
 * Dummy-mode simulators for the two Auto Ads formats (testing only).
 *
 * Google renders real anchor/vignette units itself after approval, so there is
 * no placeholder that could honestly represent them. These simulators exist so
 * the *layout impact* can still be tested pre-approval:
 *
 * - simulated anchor: does a bottom-fixed bar cover the mobile bottom nav?
 * - simulated vignette: does a fullscreen takeover trap focus/scroll?
 *
 * Hard rules: rendered ONLY on `/ads-preview`, ONLY in `house` (dummy) mode,
 * and every surface is explicitly labeled SIMULATED. They return `null` in
 * `adsense`/`off` modes, so production can never show a fake ad.
 */
export function SimulatedAnchor() {
  const config = useAdConfig();
  const [dismissed, setDismissed] = useState(false);
  if (config.mode !== 'house' || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Simulated anchor ad (testing only)"
      className="fixed inset-x-0 bottom-0 z-[70] border-t-2 border-dashed border-accent bg-card px-4 py-3 shadow-2xl"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
        <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
          Simulated anchor · test only
        </span>
        <p className="min-w-0 flex-1 truncate text-xs text-stext">
          Stand-in for Google&apos;s anchor bar — check it against the mobile bottom nav, then dismiss.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md border border-lborder px-3 py-1 text-xs font-semibold text-mtext hover:bg-secondary"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function SimulatedVignette() {
  const config = useAdConfig();
  const [open, setOpen] = useState(false);
  if (config.mode !== 'house') return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-lborder bg-secondary px-3 py-1.5 text-xs font-semibold text-mtext hover:bg-[var(--color-row-hover)]"
      >
        Trigger simulated vignette
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Simulated vignette ad (testing only)"
          className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-md border-2 border-dashed border-accent bg-card p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
              Simulated vignette · test only
            </p>
            <p className="mt-2 text-sm text-mtext">
              Stand-in for Google&apos;s fullscreen interstitial. Real vignettes fire on navigation with
              Google-controlled frequency capping and close controls.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              autoFocus
              className="btn-brand mt-4 rounded-md px-4 py-2 text-xs font-semibold"
            >
              Close preview
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
