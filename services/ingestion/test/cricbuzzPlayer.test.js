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
