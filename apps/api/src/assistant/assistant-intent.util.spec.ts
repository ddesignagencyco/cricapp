import { describe, it, expect } from '@jest/globals';
import {
  detectAssistantIntent,
  detectOutOfScopeReason,
  parseQualificationTeamQuery,
  parseTeamPairFromQuestion,
} from './assistant-intent.util.js';

describe('assistant-intent.util', () => {
  it('detects head-to-head from vs phrasing', () => {
    const r = detectAssistantIntent({ question: 'Lahore Qalandars vs Karachi Kings head to head' });
    expect(r.intent).toBe('team_head_to_head');
    expect(r.teamAQuery).toBeTruthy();
    expect(r.teamBQuery).toBeTruthy();
  });

  it('detects live win-prob explain', () => {
    const r = detectAssistantIntent({
      question: 'Why did win probability change for sr:match:abc-1?',
    });
    expect(r.intent).toBe('live_win_prob_explain');
    expect(r.matchId).toBe('sr:match:abc-1');
  });

  it('respects explicit intent override', () => {
    const r = detectAssistantIntent({
      question: 'anything',
      intent: 'match_prediction_summary',
      matchId: 'sr:match:x',
    });
    expect(r.intent).toBe('match_prediction_summary');
    expect(r.matchId).toBe('sr:match:x');
  });

  it('parseTeamPairFromQuestion splits on versus', () => {
    expect(parseTeamPairFromQuestion('India versus Australia H2H')).toEqual({
      teamAQuery: 'India',
      teamBQuery: 'Australia',
    });
  });

  it('prefers player_compare over team H2H when compare players is stated', () => {
    const r = detectAssistantIntent({
      question: 'Compare players Babar Azam vs Fakhar Zaman in PSL 2026',
    });
    expect(r.intent).toBe('player_compare');
    expect(r.season).toBe('2026');
  });

  it('detects recent form with player name', () => {
    const r = detectAssistantIntent({ question: 'Recent form of Babar Azam last 5 matches' });
    expect(r.intent).toBe('player_recent_form');
    expect(r.playerAQuery).toMatch(/Babar/i);
  });

  it('detects recent form from how has been phrasing', () => {
    const r = detectAssistantIntent({ question: 'How has Babar Azam been in PSL 2026?' });
    expect(r.intent).toBe('player_recent_form');
    expect(r.playerAQuery).toMatch(/Babar/i);
    expect(r.season).toBe('2026');
  });

  it('parses can team make playoffs phrasing', () => {
    const r = detectAssistantIntent({
      question: 'Can Karachi Kings still make PSL 2026 playoffs?',
    });
    expect(r.intent).toBe('standings_qualification');
    expect(r.teamQuery).toMatch(/Karachi/i);
  });

  it('detects PSL qualification with team hint', () => {
    const r = detectAssistantIntent({
      question: 'Can Lahore Qalandars qualify for PSL 2026 playoffs?',
    });
    expect(r.intent).toBe('standings_qualification');
    expect(r.season).toBe('2026');
    expect(r.teamQuery).toMatch(/Lahore/i);
  });

  it('does not treat standings/cutoff phrasing as a team focus', () => {
    expect(parseQualificationTeamQuery('PSL 2026 standings playoff cutoff')).toBeUndefined();
    const r = detectAssistantIntent({ question: 'PSL 2026 standings playoff cutoff' });
    expect(r.intent).toBe('standings_qualification');
    expect(r.teamQuery).toBeUndefined();
  });

  it('flags historical World Cup questions as out of scope', () => {
    expect(detectOutOfScopeReason('Who won the 1999 World Cup?')).toBeTruthy();
    const r = detectAssistantIntent({ question: 'Who won the 1999 World Cup?' });
    expect(r.intent).toBe('unknown');
    expect(r.outOfScopeReason).toBeTruthy();
  });
});
