import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toProfile, toStatTable, hasActivity, roleType, isoDate, rawPlayerId } from '../src/providers/cricbuzzPlayer.js';
import { buildPlayerFromProfile } from '../src/playerMeta.js';

const fx = (n) => JSON.parse(readFileSync(new URL(`./fixtures/cricbuzzplayer/${n}.json`, import.meta.url), 'utf8'));

test('profile maps bio fields into the player block', () => {
  const p = toProfile('13170', fx('info'), fx('career'), fx('batting'), fx('bowling'));
  assert.equal(p.player.id, 'cb:player:13170');
  assert.equal(p.player.full_name, 'Aaron Mark Hardie');
  assert.equal(p.player.date_of_birth, '1999-01-07');
  assert.equal(p.player.nationality, 'Australia');
  assert.equal(p.player.type, 'all_rounder');
  assert.match(p.player.avatar_url, /c619878/);
  assert.equal(p.cricbuzz.birthPlace, 'Bournemouth, Dorset');
  assert.ok(p.cricbuzz.clubs.some((c) => c.name === 'Peshawar Zalmi' && c.id === 'cb:team:334'));
  assert.equal(p.cricbuzz.career.t20.lastMatchId, 'cb:match:153772');
  assert.equal(p.cricbuzz.career.test, undefined, 'formats never played are left out');
  assert.equal(p.cricbuzz.recentBatting.rows[2].values[0], '10(16)');
});

test('the stored profile feeds the existing player columns', () => {
  const row = buildPlayerFromProfile(toProfile('13170', fx('info'), null, null, null));
  assert.equal(row.birth, '1999-01-07');
  assert.equal(row.nationality, 'Australia');
  assert.equal(row.role, 'all_rounder');
  assert.equal(row.battingStyle, 'Right Handed Bat');
});

test('career tables keep per-format columns; an all-zero bowling table is dropped', () => {
  const bat = toStatTable(fx('batting'));
  assert.deepEqual(bat.formats, ['Test', 'ODI', 'T20', 'IPL']);
  assert.deepEqual(bat.rows.find((r) => r.label === 'Runs').values, ['4288', '3570', '2265', '5815']);
  assert.equal(hasActivity(bat), true);
  assert.equal(hasActivity(toStatTable(fx('bowling'))), false);
  const p = toProfile('8733', fx('info'), null, fx('batting'), fx('bowling'));
  assert.ok(p.cricbuzz.batting);
  assert.equal(p.cricbuzz.bowling, null);
  assert.equal(toStatTable({ status: 'error' }), null);
});

test('helpers', () => {
  assert.equal(roleType('WK-Batter'), 'wicketkeeper');
  assert.equal(roleType('Bowler'), 'bowler');
  assert.equal(roleType('Batter'), 'batsman');
  assert.equal(isoDate('nonsense'), null);
  assert.equal(rawPlayerId('cb:player:42'), '42');
  assert.throws(() => rawPlayerId('sr:player:42'), /cb:player/);
});

test('a profile saved without the stats responses is marked incomplete for a later retry', () => {
  assert.equal(toProfile('1', fx('info'), null, null, null).cricbuzz.statsComplete, false);
  assert.equal(toProfile('1', fx('info'), null, fx('batting'), fx('bowling')).cricbuzz.statsComplete, true);
});

import { normalizeScard, toStatistics } from '../src/providers/cricbuzz.js';

test('a scorecard with batters keyed by slot is read like the list layout', () => {
  const raw = fx2('scard-keyed-layout');
  const info = {
    team1: { teamId: 304, teamName: 'Oman', teamSName: 'OMAN' },
    team2: { teamId: 24, teamName: 'Netherlands', teamSName: 'NED' },
  };
  const n = normalizeScard(raw);
  assert.ok(Array.isArray(n.scorecard[0].batsman) && n.scorecard[0].batsman.length > 5);
  assert.equal(n.scorecard[0].batsman[0].name, 'Jatinder Singh');
  assert.equal(normalizeScard(n).scorecard[0].batsman.length, n.scorecard[0].batsman.length, 'idempotent');
  const { statistics } = toStatistics(info, raw);
  const [inn1] = statistics.innings;
  assert.equal(inn1.batting_team, 'cb:team:304');
  const batters = inn1.teams[0].statistics.batting.players;
  assert.equal(batters[0].id, 'cb:player:10453');
  assert.equal(batters[0].statistics.runs, 30);
  assert.equal(batters[0].statistics.dismissal.type, 'bowled');
  assert.ok(inn1.teams[1].statistics.bowling.players.some((p) => p.name === 'Fred Klaassen'));
});

function fx2(n) {
  return JSON.parse(readFileSync(new URL(`./fixtures/cricbuzz/${n}.json`, import.meta.url), 'utf8'));
}

import { toRoster as toRosterU, roleFromSection } from '../src/providers/cricbuzzRef.js';

test('team roster (teams/v1/{id}/players): section headings give the role of the players after them', () => {
  const r = toRosterU('cb:team:3', {
    player: [
      { name: 'BATSMEN', imageId: 1 },
      { id: '8364', name: 'Imam-ul-Haq', imageId: 617489, battingStyle: 'Left-hand bat' },
      { name: 'ALL ROUNDERS', imageId: 1 },
      { id: '9', name: 'Shadab', imageId: 5, bowlingStyle: 'Legbreak' },
      { name: 'WICKET KEEPERS' },
      { id: '10', name: 'Rizwan' },
    ],
  });
  assert.deepEqual(r.players.map((p) => [p.id, p.role]), [
    ['cb:player:8364', 'batsman'], ['cb:player:9', 'all_rounder'], ['cb:player:10', 'wicketkeeper'],
  ]);
  assert.match(r.players[0].avatar_url, /c617489/);
  assert.equal(roleFromSection('BOWLERS'), 'bowler');
  assert.deepEqual(toRosterU('cb:team:129', {}).players, []);
});

import { teamForSquadName } from '../src/providers/cricbuzzRef.js';

test('an announced squad belongs to the team with the longest matching name', () => {
  const teams = [
    { id: 'cb:team:4', name: 'Australia' },
    { id: 'cb:team:129', name: 'Australia U19' },
    { id: 'cb:team:130', name: 'India U19' },
  ];
  assert.equal(teamForSquadName('Australia U19 ODI & Test Squad', teams).id, 'cb:team:129');
  assert.equal(teamForSquadName('Australia Test Squad', teams).id, 'cb:team:4');
  assert.equal(teamForSquadName('India U19 ODI Squad', teams).id, 'cb:team:130');
  assert.equal(teamForSquadName('Nepal Squad', teams), null);
});

const official = (n) =>
  JSON.parse(readFileSync(new URL(`./fixtures/cricbuzz-official/${n}.json`, import.meta.url), 'utf8'));

test('official profile responses (stats/v1/player/{id}, /career, /batting, /bowling) map to a full profile', () => {
  const p = toProfile('8359', official('player-info'), official('player-career'), official('player-batting'), official('player-bowling'));
  assert.equal(p.player.id, 'cb:player:8359');
  assert.equal(p.player.name, 'Babar Azam');
  assert.equal(p.player.date_of_birth, '1994-10-15');
  assert.equal(p.player.type, 'batsman');
  assert.equal(p.player.nationality, 'Pakistan');
  assert.ok(p.cricbuzz.bio.length > 500);
  assert.ok(p.cricbuzz.career.t20.debut.includes('2016'));
  assert.deepEqual(p.cricbuzz.batting.formats, ['Test', 'ODI', 'T20', 'IPL']);
  assert.equal(p.cricbuzz.batting.rows.find((r) => r.label === 'Runs').values[0], '4821');
  assert.equal(p.cricbuzz.statsComplete, true);
});

test('the official team roster is grouped by role headings', () => {
  const r = toRosterU('cb:team:3', official('team-players'));
  assert.ok(r.players.length >= 40);
  assert.equal(r.players[0].role, 'batsman');
  assert.ok(r.players.some((x) => x.role === 'wicketkeeper'));
  assert.ok(r.players.some((x) => x.role === 'bowler'));
});
