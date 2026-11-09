import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchReport, matchPreview, ordinal, pslTable, oversToBalls, possessive } from './generators.mjs';

const payload = {
  statistics: {
    innings: [
      { teams: [
        { id: 'cb:team:1', name: 'Alpha', statistics: { batting: { runs: 150, wickets_lost: 7, players: [
          { id: 'cb:player:1', name: 'A One', statistics: { runs: 70, balls_faced: 40 } },
          { id: 'cb:player:2', name: 'A Two', statistics: { runs: 20, balls_faced: 15 } },
        ] } } },
        { id: 'cb:team:2', name: 'Beta', statistics: { bowling: { players: [
          { id: 'cb:player:9', name: 'B Nine', statistics: { wickets: 3, conceded_runs: 25 } },
        ] } } },
      ] },
      { teams: [
        { id: 'cb:team:2', name: 'Beta', statistics: { batting: { runs: 151, wickets_lost: 3, players: [
          { id: 'cb:player:8', name: 'B Eight', statistics: { runs: 80, balls_faced: 50 } },
        ] } } },
        { id: 'cb:team:1', name: 'Alpha', statistics: { bowling: { players: [
          { id: 'cb:player:3', name: 'A Three', statistics: { wickets: 1, conceded_runs: 30 } },
        ] } } },
      ] },
    ],
  },
};
const match = {
  match_id: 'cb:match:1', team_names: ['Alpha', 'Beta'], tournament: 'Test Cup', venue: 'Main Ground',
  scheduled: '2026-01-02T10:00:00.000Z', result_text: 'Beta won by 7 wkts', teams_ids: ['cb:team:1', 'cb:team:2'],
};

test('a match report states only what the scorecard says', () => {
  const r = matchReport(match, payload);
  assert.match(r.title, /Beta .* Alpha by 7 wickets/);
  assert.match(r.html, /Batting first, Alpha made 150\/7/);
  assert.match(r.html, /A One<\/a> top-scored with 70 from 40 balls/);
  assert.match(r.html, /B Nine<\/a> took 3\/25/);
  assert.match(r.html, /In reply, Beta made 151\/3/);
  assert.deepEqual(r.matchIds, ['cb:match:1']);
  assert.ok(r.playerIds.includes('cb:player:8'));
  assert.equal(r.publishedAt.getTime(), new Date('2026-01-02T14:00:00.000Z').getTime());
  assert.doesNotMatch(r.html, /margin was/);
});

test('no report without a result or an innings', () => {
  assert.equal(matchReport({ ...match, result_text: null }, payload), null);
  assert.equal(matchReport(match, { statistics: { innings: [] } }), null);
});

test('a drawn or no-result match still gets an honest title', () => {
  const r = matchReport({ ...match, result_text: 'Match drawn' }, payload);
  assert.equal(r.title, 'Alpha v Beta: Match drawn');
});

test('a preview never publishes in the future', () => {
  const future = new Date(Date.now() + 5 * 86400e3).toISOString();
  const a = matchPreview({ ...match, scheduled: future }, ['W', 'L'], []);
  assert.ok(a.publishedAt.getTime() <= Date.now());
  assert.match(a.html, /last 2 completed matches: W L/);
  assert.match(a.html, /no recent completed matches stored for Beta/);
});

test('ordinals, standings and overs', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 21, 22].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '21st', '22nd']);
  const rows = [1, 2, 3, 4, 5].map((rank) => ({ rank, team_id: `t${rank}`, team_name: `T${rank}`, team_abbr: `T${rank}`, played: 10, won: 10 - rank, lost: rank, points: 20 - rank }));
  const t = pslTable(2026, rows);
  assert.match(t.html, /T5<\/a> finished 5th/);
  assert.equal(pslTable(2026, rows.slice(0, 3)), null);
  assert.equal(oversToBalls('3.2'), 20);
  assert.equal(possessive('UAE Bulls'), "UAE Bulls'");
  assert.equal(possessive('India'), "India's");
});
