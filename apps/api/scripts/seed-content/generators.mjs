/**
 * Articles written from the data already in the database. Every figure and name comes from a stored
 * match, scorecard or table; nothing is quoted and nothing is invented. Phrasing varies with a
 * hash of the id so a run of reports does not read like one template.
 */

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = (id, options) => options[hash(id) % options.length];
const p = (...t) => `<p>${t.join(' ')}</p>`;
const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
const when = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const matchLink = (id, text) => `<a href="/matches/${esc(id)}">${esc(text)}</a>`;
const playerLink = (id, name) => `<a href="/players/${esc(id)}">${esc(name)}</a>`;
const teamLink = (id, name) => `<a href="/teams/${esc(id)}">${esc(name)}</a>`;

export const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

export const possessive = (name) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const oversToBalls = (o) => {
  const [w, b] = String(o ?? '0').split('.');
  return num(w) * 6 + Math.min(5, num(b));
};

/** Pull the innings summaries out of a stored scorecard payload. */
export function inningsOf(payload) {
  const list = Array.isArray(payload?.statistics?.innings) ? payload.statistics.innings : [];
  return list.map((inn) => {
    const [batTeam, bowlTeam] = inn.teams ?? [];
    const batters = batTeam?.statistics?.batting?.players ?? [];
    const bowlers = bowlTeam?.statistics?.bowling?.players ?? [];
    const topBat = [...batters].sort((a, b) => num(b.statistics?.runs) - num(a.statistics?.runs))[0];
    const topBowl = [...bowlers].sort(
      (a, b) => num(b.statistics?.wickets) - num(a.statistics?.wickets) || num(a.statistics?.conceded_runs) - num(b.statistics?.conceded_runs),
    )[0];
    return {
      batId: batTeam?.id,
      batName: batTeam?.name,
      bowlName: bowlTeam?.name,
      runs: num(batTeam?.statistics?.batting?.runs),
      wickets: num(batTeam?.statistics?.batting?.wickets_lost),
      topBat: topBat && num(topBat.statistics?.runs) > 0 ? topBat : null,
      topBowl: topBowl && num(topBowl.statistics?.wickets) > 0 ? topBowl : null,
    };
  });
}

const batLine = (b) => `${b.name} (${b.statistics.runs} off ${b.statistics.balls_faced ?? '?'})`;
const bowlLine = (b) => `${b.name} (${b.statistics.wickets}/${b.statistics.conceded_runs})`;

/** One match report for a finished match with a result and a scorecard. */
export function matchReport(m, payload) {
  const inns = inningsOf(payload);
  if (!inns.length || !m.result_text) return null;
  const [t1, t2] = m.team_names;
  const res = m.result_text;
  const won = res.match(/^(.*?) won by (?:an innings and )?(\d+) (wkts?|runs?)/i);
  const winner = won?.[1] ?? null;
  const margin = won ? { n: Number(won[2]), kind: /wk/i.test(won[3]) ? 'wicket' : 'run' } : null;
  const loser = winner ? (winner === t1 ? t2 : t1) : null;

  let title;
  if (winner && margin) {
    const big = margin.kind === 'wicket' ? margin.n >= 7 : margin.n >= 40;
    const tight = margin.kind === 'wicket' ? margin.n <= 2 : margin.n <= 5;
    const verb = big ? pick(m.match_id, ['cruise past', 'comfortably beat', 'brush aside']) : tight ? pick(m.match_id, ['edge out', 'scrape past', 'hold off']) : pick(m.match_id, ['beat', 'overcome', 'see off']);
    title = `${winner} ${verb} ${loser} by ${plural(margin.n, margin.kind)}`;
  } else {
    title = `${t1} v ${t2}: ${res}`;
  }

  const paras = [];
  paras.push(
    p(
      `${esc(res)} at ${esc(m.venue ?? 'the ground')} in the ${esc(m.tournament ?? 'match')} on ${when(m.scheduled)}.`,
    ),
  );
  inns.forEach((inn, i) => {
    const bits = [`${i === 0 ? 'Batting first' : i === 1 ? 'In reply' : `In innings ${i + 1}`}, ${esc(inn.batName)} made ${inn.runs}/${inn.wickets}.`];
    if (inn.topBat) bits.push(`${playerLink(inn.topBat.id, inn.topBat.name)} top-scored with ${inn.topBat.statistics.runs}${inn.topBat.statistics.balls_faced ? ` from ${inn.topBat.statistics.balls_faced} balls` : ''}.`);
    if (inn.topBowl) bits.push(`For ${esc(inn.bowlName)}, ${playerLink(inn.topBowl.id, inn.topBowl.name)} took ${inn.topBowl.statistics.wickets}/${inn.topBowl.statistics.conceded_runs}.`);
    paras.push(p(...bits));
  });
  paras.push(p(`The full scorecard is on the ${matchLink(m.match_id, `${t1} v ${t2}`)} match page.`));

  const players = [];
  for (const inn of inns) {
    if (inn.topBat) players.push(inn.topBat.id);
    if (inn.topBowl) players.push(inn.topBowl.id);
  }
  const first = inns[0];
  const second = inns[1];
  return {
    slug: `match-report-${m.match_id.replace(/[^a-z0-9]+/gi, '-')}`,
    title,
    summary: `${res}. ${first.batName} ${first.runs}/${first.wickets}${second ? `, ${second.batName} ${second.runs}/${second.wickets}` : ''}.`,
    html: paras.join('\n'),
    category: 'match-news',
    label: m.tournament ?? 'Match report',
    scoreline: second ? `${first.batName} ${first.runs}/${first.wickets}  ·  ${second.batName} ${second.runs}/${second.wickets}` : `${first.batName} ${first.runs}/${first.wickets}`,
    publishedAt: new Date(new Date(m.scheduled).getTime() + 4 * 3600e3),
    matchIds: [m.match_id],
    teamIds: (m.teams_ids ?? []).filter(Boolean),
    playerIds: [...new Set(players)],
  };
}

/** Preview of an upcoming match with each side's last results (win/loss from stored matches). */
export function matchPreview(m, formA, formB) {
  const [t1, t2] = m.team_names;
  const fmt = (name, f) =>
    f.length ? `${esc(possessive(name))} last ${f.length} completed ${f.length === 1 ? 'match' : 'matches'}: ${f.join(' ')} (most recent first).` : `We have no recent completed matches stored for ${esc(name)}.`;
  const html = [
    p(`${esc(t1)} face ${esc(t2)} in the ${esc(m.tournament ?? 'fixture')} at ${esc(m.venue ?? 'a venue to be confirmed')} on ${when(m.scheduled)}.`),
    p(fmt(t1, formA)),
    p(fmt(t2, formB)),
    p(`Follow the ${matchLink(m.match_id, `${t1} v ${t2}`)} match page for the live score, scorecard and our win-probability model once the match starts.`),
  ].join('\n');
  return {
    slug: `match-preview-${m.match_id.replace(/[^a-z0-9]+/gi, '-')}`,
    title: `Preview: ${t1} v ${t2}`,
    summary: `${t1} v ${t2}, ${m.tournament ?? 'upcoming fixture'}, ${when(m.scheduled)}.`,
    html,
    category: 'match-news',
    label: 'Match preview',
    scoreline: `${when(m.scheduled)}`,
    publishedAt: new Date(Math.min(Date.now(), new Date(m.scheduled).getTime()) - 3600e3),
    matchIds: [m.match_id],
    teamIds: (m.teams_ids ?? []).filter(Boolean),
    playerIds: [],
  };
}

/** A PSL season table, written from the stored standings (points, wins, losses; no run-rate claims). */
export function pslTable(year, rows) {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  if (sorted.length < 4) return null;
  const top = sorted.slice(0, 4);
  const last = sorted[sorted.length - 1];
  const list = top
    .map((r) => `<li>${teamLink(r.team_id, r.team_name)}: ${r.points} points from ${r.played} matches (${r.won} won, ${r.lost} lost)</li>`)
    .join('');
  return {
    slug: `psl-${year}-standings-review`,
    title: `PSL ${year} table: ${top[0].team_name} finish top`,
    summary: `Where every team finished in PSL ${year}, led by ${top[0].team_name} on ${top[0].points} points.`,
    html: [
      p(`${esc(top[0].team_name)} finished first in the PSL ${year} table with ${top[0].points} points from ${top[0].played} matches.`),
      `<h2>The top four</h2><ol>${list}</ol>`,
      p(`At the other end, ${teamLink(last.team_id, last.team_name)} finished ${ordinal(last.rank)} with ${last.points} points (${last.won} won, ${last.lost} lost).`),
      p('The full standings, fixtures, squads and leaders are on the <a href="/psl">PSL page</a>.'),
    ].join('\n'),
    category: 'psl',
    label: `PSL ${year}`,
    scoreline: `${top[0].team_abbr} ${top[0].points} pts`,
    publishedAt: new Date(Date.UTC(year, 5, 1)),
    matchIds: [],
    teamIds: top.map((r) => r.team_id),
    playerIds: [],
  };
}

/** Spotlight on a batter from their numbers in the tracked scorecards. */
export function batterSpotlight(s) {
  const avg = s.dismissals ? (s.runs / s.dismissals).toFixed(2) : null;
  const sr = s.balls ? ((s.runs / s.balls) * 100).toFixed(1) : null;
  return {
    slug: `numbers-behind-${s.id.replace(/[^a-z0-9]+/gi, '-')}`,
    title: `${s.name}: ${s.runs} runs in the matches we track`,
    summary: `${s.name} has ${s.runs} runs from ${plural(s.innings, 'innings', 'innings')} in tracked matches${sr ? `, striking at ${sr}` : ''}.`,
    html: [
      p(`${playerLink(s.id, s.name)} has scored ${s.runs} runs in ${plural(s.innings, 'innings', 'innings')} across ${plural(s.matches, 'tracked match', 'tracked matches')}${avg ? `, at an average of ${avg}` : ''}${sr ? ` and a strike rate of ${sr}` : ''}.`),
      p(`His highest score in that sample is ${s.highest}${s.highestNotOut ? ' not out' : ''}, with ${s.fours} fours and ${s.sixes} sixes${s.fifties || s.hundreds ? `, including ${plural(s.fifties, 'fifty', 'fifties')} and ${plural(s.hundreds, 'hundred')}` : ''}.`.replace('His', 'The')),
      p('These figures cover only the matches CricApp has stored scorecards for, so they are a snapshot and not career totals. The full profile, with biography and recent form, is on the player page.'),
    ].join('\n'),
    category: 'analysis',
    label: 'By the numbers',
    scoreline: `${s.runs} runs · ${s.innings} inns`,
    publishedAt: new Date(Date.now() - (hash(s.id) % 72) * 3600e3 - 6 * 3600e3),
    matchIds: [],
    teamIds: s.teamId ? [s.teamId] : [],
    playerIds: [s.id],
  };
}

export function bowlerSpotlight(s) {
  const econ = s.balls ? ((s.runs / s.balls) * 6).toFixed(2) : null;
  return {
    slug: `bowling-numbers-${s.id.replace(/[^a-z0-9]+/gi, '-')}`,
    title: `${s.name}: ${s.wickets} wickets in the matches we track`,
    summary: `${s.name} has ${s.wickets} wickets in tracked matches${econ ? ` at an economy of ${econ}` : ''}.`,
    html: [
      p(`${playerLink(s.id, s.name)} has taken ${s.wickets} wickets in ${plural(s.innings, 'bowling innings', 'bowling innings')} across ${plural(s.matches, 'tracked match', 'tracked matches')}${econ ? `, conceding ${econ} an over` : ''}.`),
      p(`The best figures in that sample are ${s.best}.`),
      p('These numbers come only from the scorecards stored here, so they are not career figures. See the player page for the biography and recent form.'),
    ].join('\n'),
    category: 'analysis',
    label: 'By the numbers',
    scoreline: `${s.wickets} wkts · ${s.innings} inns`,
    publishedAt: new Date(Date.now() - (hash(s.id) % 72) * 3600e3 - 8 * 3600e3),
    matchIds: [],
    teamIds: s.teamId ? [s.teamId] : [],
    playerIds: [s.id],
  };
}

/** A top-five record list: items are { text, matchId }. */
export function recordList({ slug, title, summary, intro, items, label }) {
  const li = items.map((i) => `<li>${i.text} — ${matchLink(i.matchId, 'scorecard')}</li>`).join('');
  return {
    slug,
    title,
    summary,
    html: [p(intro), `<ol>${li}</ol>`, p('These lists cover the matches CricApp tracks, not every match ever played.')].join('\n'),
    category: 'records',
    label,
    scoreline: '',
    publishedAt: new Date(Date.now() - 2 * 86400e3),
    matchIds: items.map((i) => i.matchId),
    teamIds: [],
    playerIds: [],
  };
}

/* ---------- articles from the fixtures list alone (no scorecards needed) ---------- */

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sides = (m) => ({ home: m.team_scores?.home ?? {}, away: m.team_scores?.away ?? {} });
const sideScore = (s) => (s?.score ? `${esc(s.name)} ${esc(s.score)}${s.overs ? ` (${esc(s.overs)} ov)` : ''}` : null);
const isPakistan = (m) => (m.team_names ?? []).some((n) => /pakistan/i.test(n));
const isWomen = (m) => /women/i.test(`${m.tournament ?? ''} ${(m.team_names ?? []).join(' ')}`);
const isInternational = (m) => /\btour\b|\bseries\b|T20I|ODI|ICC|Asia Cup|World Cup|Emerging Nations/i.test(m.tournament ?? '');
const editorialCategory = (m) => (isPakistan(m) ? 'pakistan-cricket' : isWomen(m) && !isInternational(m) ? 'features' : isInternational(m) ? 'international' : 'match-news');
const utcStamp = (d) => new Date(d).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

/** A finished match, written from the stored result line and the two innings scores. */
export function matchResultBrief(m) {
  const { home, away } = sides(m);
  const [t1, t2] = m.team_names ?? [home.name, away.name];
  if (!m.result_text || !t1 || !t2) return null;
  const scores = [sideScore(home), sideScore(away)].filter(Boolean);
  const html = [
    p(`${esc(m.result_text)}. ${esc(t1)} played ${esc(t2)} in the ${esc(m.tournament ?? 'fixture')} at ${esc(m.venue ?? 'a venue to be confirmed')} on ${when(m.scheduled)}.`),
    scores.length ? p(`The scores: ${scores.join('; ')}.`) : '',
    p(`The full ${matchLink(m.match_id, `${t1} v ${t2}`)} page has the scorecard and ball-by-ball detail where the data provider supplies it.`),
  ].filter(Boolean).join('\n');
  return {
    slug: `match-result-${slugify(m.match_id)}`,
    title: `${t1} v ${t2}: ${m.result_text}`,
    summary: `${m.result_text}. ${t1} v ${t2}, ${m.tournament ?? 'fixture'}, ${when(m.scheduled)}.`,
    html,
    category: editorialCategory(m),
    label: 'Match result',
    scoreline: `${m.result_text}`,
    publishedAt: new Date(Math.min(Date.now(), new Date(m.scheduled).getTime() + 8 * 3600e3)),
    matchIds: [m.match_id],
    teamIds: [home.id, away.id].filter(Boolean),
    playerIds: [],
  };
}

const li = (m, extra) => `<li>${matchLink(m.match_id, (m.team_names ?? []).join(' v '))} — ${esc(m.tournament ?? '')}${extra ? `: ${extra}` : ''}</li>`;

/** One digest for the day: what is live, what finished, what is next. Dated by the clock it is written at. */
export function cricketToday(live, finished, next, now = new Date()) {
  if (!live.length && !finished.length && !next.length) return null;
  const day = when(now);
  const parts = [p(`CricApp's round-up of the cricket on ${day}, written from the match data we hold at ${utcStamp(now)}. Live scores change quickly, so open a match page for the current state.`)];
  if (live.length) {
    parts.push('<h2>Live now</h2>', `<ul>${live.map((m) => { const { home, away } = sides(m); return li(m, [sideScore(home), sideScore(away)].filter(Boolean).join(' · ') || 'yet to start'); }).join('')}</ul>`);
  }
  if (finished.length) {
    parts.push('<h2>Recent results</h2>', `<ul>${finished.map((m) => li(m, esc(m.result_text ?? 'result to follow'))).join('')}</ul>`);
  }
  if (next.length) {
    parts.push('<h2>Coming up</h2>', `<ul>${next.map((m) => li(m, `${when(m.scheduled)}, ${esc(m.venue ?? 'venue to be confirmed')}`)).join('')}</ul>`);
  }
  const t = (n, w, many) => plural(n, w, many);
  return {
    slug: `cricket-today-${now.toISOString().slice(0, 10)}`,
    title: `Cricket today, ${day}: ${t(live.length, 'match', 'matches')} live, ${t(finished.length, 'result')} in`,
    summary: `${t(live.length, 'match', 'matches')} live, ${t(finished.length, 'recent result')} and ${t(next.length, 'fixture')} to come on ${day}.`,
    html: parts.join('\n'),
    category: 'breaking',
    label: 'Cricket today',
    scoreline: `${live.length} live`,
    publishedAt: now,
    matchIds: [...live, ...finished, ...next].map((m) => m.match_id),
    teamIds: [],
    playerIds: [],
  };
}

/** Where a competition stands: every stored match in it, grouped by state. */
export function tournamentWatch(name, tournamentId, rows) {
  if (!name || rows.length < 2) return null;
  const by = (s) => rows.filter((m) => m.status === s);
  const live = by('live'), done = by('completed'), next = by('upcoming');
  const parts = [p(`${esc(name)} currently has ${plural(rows.length, 'match')} on CricApp: ${live.length} live, ${done.length} completed and ${next.length} upcoming.`)];
  if (live.length) parts.push('<h2>Live</h2>', `<ul>${live.map((m) => li(m, [sideScore(sides(m).home), sideScore(sides(m).away)].filter(Boolean).join(' · ') || 'yet to start')).join('')}</ul>`);
  if (done.length) parts.push('<h2>Results</h2>', `<ul>${done.map((m) => li(m, esc(m.result_text ?? ''))).join('')}</ul>`);
  if (next.length) parts.push('<h2>Fixtures</h2>', `<ul>${next.map((m) => li(m, when(m.scheduled))).join('')}</ul>`);
  if (tournamentId) parts.push(p(`More on the <a href="/tournaments/${esc(tournamentId)}">${esc(name)}</a> page.`));
  const lead = rows[0];
  return {
    slug: `tournament-watch-${slugify(name)}`,
    title: `${name}: results, fixtures and live scores`,
    summary: `${live.length} live, ${done.length} completed, ${next.length} upcoming in the ${name}.`,
    html: parts.join('\n'),
    category: editorialCategory(lead),
    label: 'Tournament watch',
    scoreline: name,
    publishedAt: new Date(Date.now() - 30 * 60e3),
    matchIds: rows.map((m) => m.match_id),
    teamIds: [],
    playerIds: [],
  };
}

/** The busiest competitions in the data, as a numbers piece. */
export function busiestCompetitions(rows, now = new Date()) {
  const counts = new Map();
  for (const m of rows) if (m.tournament) counts.set(m.tournament, (counts.get(m.tournament) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  if (top.length < 3) return null;
  const state = (s) => rows.filter((m) => m.status === s).length;
  return {
    slug: `analysis-busiest-competitions-${now.toISOString().slice(0, 10)}`,
    title: 'By the numbers: where the cricket is right now',
    summary: `${top[0][0]} has the most matches on CricApp (${top[0][1]}), among ${counts.size} competitions in the data.`,
    html: [
      p(`CricApp holds ${plural(rows.length, 'match')} across ${plural(counts.size, 'competition')} in its current window: ${state('live')} live, ${state('completed')} completed and ${state('upcoming')} upcoming.`),
      '<h2>Most matches in the window</h2>',
      `<ol>${top.map(([n, c]) => `<li>${esc(n)} — ${plural(c, 'match')}</li>`).join('')}</ol>`,
      p('Counts cover the fixtures our data provider lists for the current days, not full seasons.'),
    ].join('\n'),
    category: 'analysis',
    label: 'Analysis',
    scoreline: `${counts.size} competitions`,
    publishedAt: new Date(now.getTime() - 3600e3),
    matchIds: [],
    teamIds: [],
    playerIds: [],
  };
}
