import { describe, expect, it } from 'vitest';
import { matchSides, publicTossFact } from '../lib/predictions';
import type { PredictionRun } from '../types/predictions';

/** Only `explanation` is read by publicTossFact. */
const runWith = (explanation: Record<string, unknown>) =>
  ({ explanation } as unknown as PredictionRun);

const GLAMORGAN_MATCH = {
  teams: {
    home: { code: 'sr:competitor:195222', name: 'Glamorgan' },
    away: { code: 'sr:competitor:195221', name: 'Essex' },
  },
  teamNames: ['Glamorgan', 'Essex'],
  toss: 'sr:competitor:195221',
};

const sides = matchSides(GLAMORGAN_MATCH);

describe('publicTossFact', () => {
  it('resolves a raw competitor id to the team name', () => {
    expect(publicTossFact(null, GLAMORGAN_MATCH, sides)).toBe('Essex');
  });

  it('never prints a raw sr: id, even when it matches neither side', () => {
    const match = { ...GLAMORGAN_MATCH, toss: 'sr:competitor:999999' };
    // Nothing readable to show, so the Toss row is dropped entirely.
    expect(publicTossFact(null, match, sides)).toBeNull();
  });

  it('expands a short team code when the match actually stores one', () => {
    const match = {
      teams: { home: { code: 'GLA', name: 'Glamorgan' }, away: { code: 'ESS', name: 'Essex' } },
      teamNames: ['Glamorgan', 'Essex'],
      toss: 'ESS',
    };
    expect(publicTossFact(null, match, matchSides(match))).toBe('Essex');
  });

  it('leaves an unresolvable short code alone rather than guessing', () => {
    // Glamorgan's stored code is a namespaced id, so "ESS" cannot be tied to a side.
    expect(publicTossFact(null, { ...GLAMORGAN_MATCH, toss: 'ESS' }, sides)).toBe('ESS');
  });

  it('still expands plain home/away text into team names', () => {
    expect(publicTossFact(null, { ...GLAMORGAN_MATCH, toss: 'home' }, sides)).toBe('Glamorgan');
    expect(publicTossFact(null, { ...GLAMORGAN_MATCH, toss: 'away' }, sides)).toBe('Essex');
  });

  it('passes a readable toss winner straight through', () => {
    expect(publicTossFact(null, { ...GLAMORGAN_MATCH, toss: 'Essex won the toss' }, sides)).toBe(
      'Essex won the toss'
    );
  });

  it('falls back to the decision when the winner id cannot be placed', () => {
    const match = { ...GLAMORGAN_MATCH, toss: 'sr:competitor:999999' };
    expect(publicTossFact(runWith({ tossDecision: 'batting first' }), match, sides)).toBe(
      'Toss: batting first'
    );
  });

  it('drops the raw id but keeps the adjusted marker', () => {
    const run = runWith({ tossAdjusted: true, tossDecision: 'chasing' });
    const match = { ...GLAMORGAN_MATCH, toss: 'sr:competitor:999999' };
    const text = publicTossFact(run, match, sides);
    expect(text).toBe('Toss is already in this chance · chasing');
    expect(text).not.toMatch(/sr:/);
  });

  it('returns null when there is no toss information at all', () => {
    expect(publicTossFact(null, { teams: GLAMORGAN_MATCH.teams }, sides)).toBeNull();
  });
});
