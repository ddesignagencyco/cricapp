process.env.RAPIDAPI_KEY = 'test-key';
process.env.RAPIDAPI_MIN_INTERVAL_MS = '1';
process.env.RAPIDAPI_CATALOGUE_YEARS = '2025,2026';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setStore } from '../src/providers/rapidHttp.js';
import { ProviderUnsupportedError } from '../src/providers/errors.js';
import * as cbu from '../src/providers/cricbuzzu.js';
import * as facade from '../src/providers/index.js';
import { normalizeStandings, normalizeSchedule, normalizeLeaders, normalizeSquad } from '../src/psl.js';
import { normalizeTournaments } from '../src/reference.js';

// Recorded from unofficial-cricbuzz on 2026-11-09 (match lists trimmed to the fields used).
const fx = (name) => JSON.parse(readFileSync(new URL(`./fixtures/cricbuzzu/${name}`, import.meta.url)));
const PSL_2024 = 'sr:season:114833';
const PSL_2025 = 'sr:season:129023';
const PSL_2026 = 'sr:season:140552';

function memoryStore() {
  const data = new Map();
  return {
    get: async (k) => data.get(k) ?? null,
    set: async (k, v) => void data.set(k, v),
    incr: async (k) => {
      const n = Number(data.get(k) ?? 0) + 1;
      data.set(k, String(n));
      return n;
    },
    expire: async () => {},
  };
}

const realFetch = globalThis.fetch;
let calls;
const query = (url, key) => new URL(url).searchParams.get(key);

const route = (url) => {
  const path = new URL(url).pathname;
  // recorded for the league category only; the other categories are empty here
  if (path === '/series/list' && query(url, 'matchType') === 'international') {
    const day = 86400000;
    const now = Date.now();
    return {
      seriesMap: [
        {
          date: 'NOW',
          series: [
            { id: 13037, name: 'Sri Lanka tour of Pakistan, 2026', startDt: String(now - 3 * day), endDt: String(now + 20 * day) },
            { id: 13100, name: 'ICC Mens T20 World Cup 2026', startDt: String(now + 60 * day), endDt: String(now + 90 * day) },
            { id: 99, name: 'Old tour of Nowhere, 2020', startDt: String(now - 2000 * day), endDt: String(now - 1990 * day) },
          ],
        },
      ],
    };
  }
  if (path === '/series/list') return query(url, 'matchType') === 'league' ? fx('series-list-league.json') : { seriesMap: [] };
  if (path === '/series/list-archives') {
    if (query(url, 'matchType') !== 'league') return { seriesMap: [] };
    return Number(query(url, 'year')) === 2026 ? fx('series-archive-league-2026.json') : fx('series-archive-league-2025.json');
  }
  if (path === '/series/get-matches') return fx(`matches-${query(url, 'seriesId')}.json`);
  if (path === '/series/get-points-table') return fx(`points-${query(url, 'seriesId')}.json`);
  if (path === '/series/get-stats') return fx('stats-11372.json')[query(url, 'statsType')];
  if (path === '/series/get-squads') return fx(`squads-${query(url, 'seriesId')}.json`);
  if (path === '/series/get-players') return fx('players-100200.json');
  return undefined;
};

beforeEach(() => {
  setStore(memoryStore());
  process.env.DATA_PROVIDER = 'cricbuzzu';
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const body = route(String(url));
    if (body === undefined) throw new Error(`unrouted ${url}`);
    const text = JSON.stringify(body);
    return { ok: true, status: 200, json: async () => JSON.parse(text), text: async () => text, clone() { return this; } };
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.DATA_PROVIDER;
});

const flatMatches = (p) => p.adWrapper.flatMap((w) => w.matchDetails.matches);

describe('tournament catalogue', () => {
  it('lists Cricbuzz series as tournaments the store can persist', async () => {
    const rows = normalizeTournaments(await facade.fetchTournaments());
    assert.ok(rows.length > 10);
    const psl = rows.find((t) => t.name === 'Pakistan Super League 2025');
    assert.equal(psl.id, 'cb:tournament:11372');
    assert.equal(psl.category.id, 'cb:category:league');
    assert.equal(psl.currentSeason.year, '2025');
    assert.equal(psl.currentSeason.start_date, '2025-04-11');
    assert.equal(new Set(rows.map((t) => t.id)).size, rows.length, 'no duplicates');
    const umbrella = rows.find((t) => t.id === 'sr:tournament:14931');
    assert.equal(umbrella.name, 'Pakistan Super League');
    assert.equal(umbrella.currentSeason.id, PSL_2026, 'seasons need this row to exist (foreign key)');
  });

  it('tours are recent international series, labelled with the host country, and open their tournament', async () => {
    const { tours } = await facade.fetchTours();
    assert.deepEqual(tours.map((t) => t.id).sort(), ['cb:tournament:13037', 'cb:tournament:13100']);
    const tour = tours.find((t) => t.id === 'cb:tournament:13037');
    assert.equal(tour.name, 'Sri Lanka tour of Pakistan, 2026');
    assert.equal(tour.category.name, 'Pakistan');
    assert.equal(tours.find((t) => t.id === 'cb:tournament:13100').category.name, 'International', 'not a bilateral tour');
  });

  it('reads the host out of a tour name', () => {
    assert.equal(cbu.hostCountry('Sri Lanka tour of Pakistan, 2026'), 'Pakistan');
    assert.equal(cbu.hostCountry('India A tour of New Zealand 2026'), 'New Zealand');
    assert.equal(cbu.hostCountry('England Women tour of India, 2025-26'), 'India');
    assert.equal(cbu.hostCountry('Afghanistan vs India in India 2026'), 'India');
    assert.equal(cbu.hostCountry('Afghanistan vs Bangladesh in UAE, 2026'), 'UAE');
    assert.equal(cbu.hostCountry('ICC Mens T20 World Cup 2026'), null);
  });

  it('ignores series that ended long ago or are far in the future', () => {
    const day = 86400000;
    const now = Date.now();
    assert.equal(cbu.isRecentSeries({ startDt: now - 3 * day, endDt: now + day }, now), true);
    assert.equal(cbu.isRecentSeries({ startDt: now - 400 * day, endDt: now - 300 * day }, now), false);
    assert.equal(cbu.isRecentSeries({ startDt: now + 400 * day, endDt: now + 410 * day }, now), false);
  });

  it('lists the PSL editions as seasons of the PSL tournament', async () => {
    const { seasons } = await facade.fetchTournamentSeasons('sr:tournament:14931');
    assert.deepEqual(seasons.map((s) => [s.id, s.year]).sort(), [[PSL_2024, '2024'], [PSL_2025, '2025'], [PSL_2026, '2026']]);
    assert.equal(seasons.find((s) => s.year === '2025').start_date, '2025-04-11');
    assert.equal(seasons.find((s) => s.year === '2024').start_date, null, '2024 is outside the catalogue window; no dates invented');
  });
});

describe('PSL standings', () => {
  it('2026 uses the official table, with real team names and logos', async () => {
    const env = await facade.fetchSeasonStandingsRaw(PSL_2026);
    assert.equal(env.derived, false);
    const rows = normalizeStandings(env.standings);
    assert.equal(rows.length, 8);
    assert.deepEqual(
      { id: rows[0].teamId, name: rows[0].teamName, rank: rows[0].rank, p: rows[0].played, w: rows[0].won, pts: rows[0].points, nrr: rows[0].netRunRate },
      { id: 'cb:team:334', name: 'Peshawar Zalmi', rank: 1, p: 10, w: 8, pts: 17, nrr: 2.324 },
    );
    assert.match(env.standings[0].groups[0].team_standings[0].team.logo_url, /static\.cricbuzz\.com.*\/c\d+\/i\.jpg$/);
  });

  it('derives 2025 from results when the upstream table is empty, and says so', async () => {
    const env = await facade.fetchSeasonStandingsRaw(PSL_2025);
    assert.equal(env.derived, true);
    const rows = normalizeStandings(env.standings);
    const leagueMatches = flatMatches(fx('matches-11372.json')).filter((m) => /^\d+(st|nd|rd|th) match$/i.test(m.matchInfo.matchDesc)).length;
    assert.equal(rows.length, 6);
    assert.equal(rows.reduce((n, r) => n + r.played, 0), leagueMatches * 2);
    assert.equal(rows.reduce((n, r) => n + r.won, 0), rows.reduce((n, r) => n + r.lost, 0));
    assert.ok(rows.every((r, i) => i === 0 || rows[i - 1].points >= r.points), 'ordered by points');
  });

  it('derivation reproduces the official 2026 table exactly (points, record and net run rate)', () => {
    const official = fx('points-11537.json').pointsTable[0].pointsTableInfo;
    const derived = cbu.deriveStandings(flatMatches(fx('matches-11537.json')));
    assert.deepEqual(derived.map((r) => r.team.teamId), official.map((o) => o.teamId));
    for (const o of official) {
      const d = derived.find((r) => r.team.teamId === o.teamId);
      assert.deepEqual(
        { p: d.played, w: d.win, l: d.loss, pts: d.points, nrr: d.nrr.toFixed(3) },
        { p: o.matchesPlayed, w: o.matchesWon, l: o.matchesLost, pts: o.points, nrr: Number(o.nrr).toFixed(3) },
        o.teamName,
      );
    }
  });

  it('derivation matches the official 2024 points, records and order (net run rate differs on rain games)', () => {
    const official = fx('points-7492.json').pointsTable[0].pointsTableInfo;
    const derived = cbu.deriveStandings(flatMatches(fx('matches-7492.json')));
    assert.deepEqual(derived.map((r) => r.team.teamId), official.map((o) => o.teamId));
    for (const o of official) {
      const d = derived.find((r) => r.team.teamId === o.teamId);
      assert.deepEqual({ w: d.win, l: d.loss, pts: d.points }, { w: o.matchesWon, l: o.matchesLost, pts: o.points }, o.teamName);
    }
  });
});

describe('PSL fixtures, leaders and squads', () => {
  it('fixtures for every season, with result text for finished games', async () => {
    const rows = normalizeSchedule(await facade.fetchSeasonSchedule(PSL_2025));
    assert.equal(rows.length, flatMatches(fx('matches-11372.json')).length);
    const first = rows[0];
    assert.equal(first.matchId, 'cb:match:115626');
    assert.equal(first.homeTeamName, 'Lahore Qalandars');
    assert.equal(first.resultText, 'Islamabad United won by 8 wkts');
    assert.equal(first.round, null, 'a regular-season game has no round; the PSL page lists those as fixtures');
    assert.equal(first.seasonId, PSL_2025);
  });

  it('only playoff games carry a round, under the keys the PSL page reads', () => {
    const k = cbu.roundKey;
    assert.equal(k('1st Match'), null);
    assert.equal(k('44th Match'), null);
    assert.equal(k('Qualifier'), 'qualifier_1');
    assert.equal(k('Qualifier 1'), 'qualifier_1');
    assert.equal(k('Qualifier (1 v 2)'), 'qualifier_1');
    assert.equal(k('Eliminator'), 'eliminator');
    assert.equal(k('Eliminator 1 (3 v 4)'), 'eliminator');
    assert.equal(k('Eliminator 2'), 'qualifier_2');
    assert.equal(k('Qualifier 2'), 'qualifier_2');
    assert.equal(k('Final'), 'final');
  });

  it('the 2026 playoffs are recognised, and every other game is a regular fixture', async () => {
    const rows = normalizeSchedule(await facade.fetchSeasonSchedule(PSL_2026));
    const playoffs = rows.filter((r) => r.round);
    assert.deepEqual(playoffs.map((r) => r.round).sort(), ['eliminator', 'final', 'qualifier_1', 'qualifier_2']);
    assert.equal(rows.length - playoffs.length, 40);
  });

  it('tournament results only contain finished games', async () => {
    const { results } = await facade.fetchTournamentResults('cb:tournament:11372');
    assert.ok(results.length > 30);
    assert.ok(results.every((r) => r.sport_event_status.match_result_text));
  });

  it('leaders cover batting and bowling categories in the shape psl.js reads', async () => {
    const groups = normalizeLeaders(await facade.fetchSeasonLeaders(PSL_2025));
    const stat = (name) => groups.find((g) => g.stat === name);
    assert.deepEqual(
      { id: stat('top_runs').entries[0].playerId, name: stat('top_runs').entries[0].playerName, value: stat('top_runs').entries[0].value },
      { id: 'cb:player:13625', name: 'Sahibzada Farhan', value: 449 },
    );
    assert.equal(stat('top_wickets').entries[0].playerName, 'Haris Rauf');
    assert.equal(stat('top_wickets').entries[0].value, 20);
    assert.equal(stat('top_sixes').entries[0].value, 28);
    assert.equal(stat('top_strike_rate').entries[0].value, 237.84);
    assert.equal(stat('highest_score').entries[0].value, 106);
    assert.equal(stat('top_economy').entries[0].value, 4);
    assert.ok(groups.filter((g) => g.entries.length).length >= 10);
  });

  it('a squad carries roles, styles and an image for each player', async () => {
    const squad = normalizeSquad(await facade.fetchSeasonSquad(PSL_2025, 'cb:team:330'));
    assert.equal(squad.teamName, 'Islamabad United');
    assert.match(squad.logoUrl, /static\.cricbuzz\.com/);
    const munro = squad.players.find((p) => p.playerName === 'Colin Munro');
    assert.equal(munro.playerId, 'cb:player:8085');
    assert.equal(munro.role, 'batsman');
    assert.equal(munro.battingStyle, 'Left-hand bat');
    assert.equal(munro.profileUrl, 'https://static.cricbuzz.com/a/img/v1/152x152/i1/c170737/i.jpg');
    assert.ok(squad.players.every((p) => p.profileUrl && !String(p.playerId).includes('undefined')));
  });

  it('finds 2024 squads even though that season labels them "<team> Squad"', async () => {
    assert.equal(cbu.squadNameKey('Karachi Kings Squad'), cbu.squadNameKey('KARACHI KINGS'));
    const squad = normalizeSquad(await facade.fetchSeasonSquad(PSL_2024, 'cb:team:332')); // Karachi Kings
    assert.equal(squad.teamName, 'Karachi Kings');
    assert.ok(squad.players.length > 0);
  });

  it('refuses ids it has no series for', async () => {
    await assert.rejects(() => facade.fetchSeasonSchedule('sr:season:999'), ProviderUnsupportedError);
    await assert.rejects(() => facade.fetchSeasonSquad(PSL_2025, 'cb:team:99999'), ProviderUnsupportedError);
  });

  it('reuses one cached fixtures request for schedule, standings and team list', async () => {
    await facade.fetchSeasonSchedule(PSL_2026);
    await facade.fetchSeasonStandingsRaw(PSL_2026);
    await facade.fetchTournamentInfo(PSL_2026);
    assert.equal(calls.filter((u) => u.includes('/series/get-matches')).length, 1);
  });
});
