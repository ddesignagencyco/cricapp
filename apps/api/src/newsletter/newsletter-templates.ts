import { BRAND, EMAIL_FONT, EMAIL_MONO, emailButton, escapeHtml, renderEmail } from '../mailer/email-layout.js';

/* ─── Types ─── */

export const NEWSLETTER_TYPES = [
  'daily_digest',
  'weekly_roundup',
  'match_preview',
  'psl_update',
  'breaking_news',
  'reengagement',
] as const;
export type NewsletterType = (typeof NEWSLETTER_TYPES)[number];

/** What each type is, in words a subscriber understands (preferences, admin list). */
export const NEWSLETTER_TYPE_INFO: Record<NewsletterType, { label: string; description: string }> = {
  daily_digest: { label: 'Daily digest', description: 'Top stories, results and fixtures every morning (only on days with real news).' },
  weekly_roundup: { label: 'Weekly roundup', description: 'The week in cricket, every Sunday.' },
  match_preview: { label: 'Match previews', description: 'Before Pakistan and PSL matches, with our win prediction.' },
  psl_update: { label: 'PSL updates', description: 'Points table, top performers and fixtures during the PSL.' },
  breaking_news: { label: 'Breaking news', description: 'Major verified stories, rarely.' },
  reengagement: { label: 'We miss you', description: 'An occasional catch-up if you have not opened a newsletter in a while.' },
};

export type Story = {
  title: string;
  url: string;
  category?: string | null;
  summary?: string | null;
  publishedAt?: Date | null;
};

export type ResultRow = {
  tournament?: string | null;
  home: { name: string; score?: string | null };
  away: { name: string; score?: string | null };
  /** "Pakistan won by 5 wickets". */
  result?: string | null;
  /** Which side won, when known, to bold it. */
  winner?: 'home' | 'away' | null;
  url: string;
};

export type FixtureRow = {
  tournament?: string | null;
  home: string;
  away: string;
  startsAt: Date;
  venue?: string | null;
  url: string;
};

export type StandingRow = { rank: number; team: string; played: number; won: number; lost: number; nrr: number; points: number };
export type LeaderRow = { rank: number; player: string; team?: string | null; value: number };

export type Prediction = { homePct: number; awayPct: number; confidence?: number | null };

/** Per-recipient links and personal touches. */
export type Recipient = {
  appUrl: string;
  unsubscribeUrl: string;
  preferencesUrl?: string;
  /** Wraps a site link for click tracking; identity when tracking is off. */
  link: (url: string) => string;
  /** Results/fixtures for the subscriber's favourite teams (linked accounts only). */
  favourites?: { teams: string[]; results: ResultRow[]; fixtures: FixtureRow[] };
};

export type RenderedNewsletter = { subject: string; preheader: string; html: string; text: string };

/* ─── Formatting ─── */

const TZ = 'Asia/Karachi';

export function formatPkt(date: Date, withDay = true): string {
  const day = date.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  return withDay ? `${day}, ${time} PKT` : `${time} PKT`;
}

function editionDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' });
}

function timeAgo(date: Date | null | undefined, now: Date): string {
  if (!date) return '';
  const mins = Math.max(1, Math.round((now.getTime() - date.getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Rounds two probabilities so they always add up to exactly 100. */
export function splitPercent(home: number, away: number): [number, number] {
  const total = home + away || 1;
  const h = Math.round((home / total) * 100);
  return [h, 100 - h];
}

/* ─── Building blocks (clean editorial typography matching the site) ─── */

const FONT = `font-family:${EMAIL_FONT};`;

function sectionTitle(label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 10px;">
  <tr><td style="${FONT}font-size:14px;font-weight:700;color:${BRAND.ink};border-bottom:1px solid ${BRAND.border};padding-bottom:7px;">${escapeHtml(label)}</td></tr>
</table>`;
}

function intro(heading: string, body: string): string {
  return `<h1 style="margin:0 0 6px;${FONT}font-size:21px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${BRAND.ink};">${heading}</h1>
<p style="margin:0;${FONT}font-size:14.5px;line-height:1.6;color:${BRAND.muted};">${body}</p>`;
}

/** Lead story: clean journalistic block without tinted boxes or thick side bars. */
function leadStory(story: Story, r: Recipient, now: Date): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;">
  <tr><td style="padding:16px 0;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};">
    <div style="${FONT}font-size:12px;font-weight:600;color:${BRAND.green};">${escapeHtml(story.category || 'Top story')}${story.publishedAt ? `<span style="color:${BRAND.muted};font-weight:400;"> &middot; ${timeAgo(story.publishedAt, now)}</span>` : ''}</div>
    <a href="${r.link(story.url)}" style="display:block;margin-top:6px;${FONT}font-size:19px;line-height:1.35;font-weight:700;letter-spacing:-0.015em;color:${BRAND.ink};text-decoration:none;">${escapeHtml(story.title)}</a>
    ${story.summary ? `<p style="margin:7px 0 0;${FONT}font-size:14px;line-height:1.58;color:${BRAND.body};">${escapeHtml(story.summary)}</p>` : ''}
    <a href="${r.link(story.url)}" style="display:inline-block;margin-top:10px;${FONT}font-size:13.5px;font-weight:600;color:${BRAND.green};text-decoration:none;">Read story &rarr;</a>
  </td></tr>
</table>`;
}

/** Clean headline rows separated by subtle hairlines. */
function storyList(stories: Story[], r: Recipient, now: Date): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${stories
  .map(
    (s) => `  <tr>
    <td style="padding:11px 0;border-bottom:1px solid ${BRAND.border};${FONT}">
      <a href="${r.link(s.url)}" style="display:block;font-size:14.5px;line-height:1.45;font-weight:600;color:${BRAND.ink};text-decoration:none;">${escapeHtml(s.title)}</a>
      <div style="margin-top:3px;font-size:12px;color:${BRAND.muted};">${escapeHtml(s.category || 'News')}${s.publishedAt ? ` &middot; ${timeAgo(s.publishedAt, now)}` : ''}</div>
    </td>
  </tr>`,
  )
  .join('\n')}
</table>`;
}

function resultCards(rows: ResultRow[], r: Recipient): string {
  return rows
    .map((row) => {
      const team = (side: 'home' | 'away') => {
        const t = row[side];
        const won = row.winner === side;
        return `<tr>
        <td style="${FONT}font-size:14px;padding:2.5px 0;color:${won ? BRAND.ink : BRAND.body};font-weight:${won ? 600 : 400};">${escapeHtml(t.name)}</td>
        <td align="right" style="font-family:${EMAIL_MONO};font-size:13.5px;padding:2.5px 0;color:${BRAND.ink};font-weight:${won ? 700 : 500};">${escapeHtml(t.score || '—')}</td>
      </tr>`;
      };
      return `<a href="${r.link(row.url)}" style="text-decoration:none;display:block;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border:1px solid ${BRAND.border};border-radius:6px;background:#FFFFFF;">
  <tr><td style="padding:11px 14px;">
    ${row.tournament ? `<div style="${FONT}font-size:11.5px;font-weight:500;color:${BRAND.muted};margin-bottom:4px;">${escapeHtml(row.tournament)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${team('home')}${team('away')}</table>
    ${row.result ? `<div style="${FONT}font-size:12.5px;font-weight:500;color:${BRAND.green};margin-top:5px;">${escapeHtml(row.result)}</div>` : ''}
  </td></tr>
</table></a>`;
    })
    .join('\n');
}

function fixtureCards(rows: FixtureRow[], r: Recipient): string {
  return rows
    .map(
      (f) => `<a href="${r.link(f.url)}" style="text-decoration:none;display:block;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border:1px solid ${BRAND.border};border-radius:6px;background:#FFFFFF;">
  <tr>
    <td style="padding:11px 14px;${FONT}">
      ${f.tournament ? `<div style="font-size:11.5px;font-weight:500;color:${BRAND.muted};">${escapeHtml(f.tournament)}</div>` : ''}
      <div style="margin-top:2px;font-size:14.5px;font-weight:600;color:${BRAND.ink};">${escapeHtml(f.home)} <span style="color:${BRAND.muted};font-weight:400;">vs</span> ${escapeHtml(f.away)}</div>
      ${f.venue ? `<div style="margin-top:2px;font-size:12px;color:${BRAND.muted};">${escapeHtml(f.venue)}</div>` : ''}
    </td>
    <td align="right" valign="middle" style="padding:11px 14px;font-family:${EMAIL_MONO};font-size:12px;font-weight:500;color:${BRAND.ink};white-space:nowrap;">
      ${escapeHtml(formatPkt(f.startsAt))}
    </td>
  </tr>
</table></a>`,
    )
    .join('\n');
}

/** Win probability split bar matching the site's WinProbabilityBar. */
function winBar(homeName: string, awayName: string, p: Prediction): string {
  const [h, a] = splitPercent(p.homePct, p.awayPct);
  const homeCell = Math.max(h, 8);
  const awayCell = Math.max(a, 8);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0;">
  <tr>
    <td style="${FONT}font-size:13.5px;font-weight:600;color:${BRAND.ink};">${escapeHtml(homeName)} <span style="font-family:${EMAIL_MONO};color:${BRAND.green};">${h}%</span></td>
    <td align="right" style="${FONT}font-size:13.5px;font-weight:600;color:${BRAND.body};"><span style="font-family:${EMAIL_MONO};">${a}%</span> ${escapeHtml(awayName)}</td>
  </tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:3px;overflow:hidden;">
  <tr>
    <td width="${homeCell}%" bgcolor="${BRAND.green}" style="background:${BRAND.green};height:7px;font-size:0;line-height:0;">&nbsp;</td>
    <td width="${awayCell}%" bgcolor="#CBD5E1" style="background:#CBD5E1;height:7px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>
</table>`;
}

/** Points table styled after CriczApp's clean cool-slate light table header (#EEF2F7). */
function standingsTable(rows: StandingRow[]): string {
  const th = (t: string, align = 'center') =>
    `<th align="${align}" style="${FONT}font-size:11.5px;font-weight:600;color:${BRAND.ink};padding:9px 6px;border-bottom:1px solid ${BRAND.borderStrong};">${t}</th>`;
  const td = (t: string | number, align = 'center', bold = false, mono = false) =>
    `<td align="${align}" style="${mono ? `font-family:${EMAIL_MONO};` : FONT}font-size:13px;color:${BRAND.ink};padding:8px 6px;border-bottom:1px solid ${BRAND.border};font-weight:${bold ? 600 : 400};">${t}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.border};border-radius:6px;overflow:hidden;">
  <tr bgcolor="${BRAND.tableHeader}" style="background:${BRAND.tableHeader};">${th('#')}${th('Team', 'left')}${th('P')}${th('W')}${th('L')}${th('NRR')}${th('Pts')}</tr>
  ${rows
    .map(
      (r) =>
        `<tr${r.rank <= 4 ? ' bgcolor="#F8FAFC" style="background:#F8FAFC;"' : ''}>${td(r.rank, 'center', false, true)}${td(escapeHtml(r.team), 'left', true)}${td(r.played, 'center', false, true)}${td(r.won, 'center', false, true)}${td(r.lost, 'center', false, true)}${td(`${r.nrr > 0 ? '+' : ''}${r.nrr.toFixed(3)}`, 'center', false, true)}${td(r.points, 'center', true, true)}</tr>`,
    )
    .join('')}
</table>
<p style="margin:6px 0 0;${FONT}font-size:12px;color:${BRAND.muted};">Top four qualify for the playoffs.</p>`;
}

function leaderList(title: string, rows: LeaderRow[], unit: string): string {
  return `<td valign="top" width="50%" style="padding:0 5px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.border};border-radius:6px;overflow:hidden;">
    <tr><td colspan="2" bgcolor="${BRAND.tableHeader}" style="background:${BRAND.tableHeader};${FONT}font-size:12px;font-weight:600;color:${BRAND.ink};padding:8px 12px;border-bottom:1px solid ${BRAND.borderStrong};">${title}</td></tr>
    ${rows
      .map(
        (l) => `<tr>
      <td style="${FONT}font-size:13px;color:${BRAND.ink};padding:7px 12px;border-top:1px solid ${BRAND.border};"><span style="font-weight:600;">${escapeHtml(l.player)}</span>${l.team ? `<br><span style="color:${BRAND.muted};font-size:11.5px;">${escapeHtml(l.team)}</span>` : ''}</td>
      <td align="right" style="font-family:${EMAIL_MONO};font-size:13.5px;font-weight:700;color:${BRAND.ink};padding:7px 12px;border-top:1px solid ${BRAND.border};white-space:nowrap;">${l.value} <span style="font-family:${EMAIL_FONT};font-size:11px;color:${BRAND.muted};font-weight:400;">${unit}</span></td>
    </tr>`,
      )
      .join('')}
  </table>
</td>`;
}

function favouritesBlock(r: Recipient): string {
  const fav = r.favourites;
  if (!fav || (!fav.results.length && !fav.fixtures.length)) return '';
  return `${sectionTitle(`Your teams · ${fav.teams.slice(0, 3).join(', ')}`)}
${resultCards(fav.results.slice(0, 2), r)}
${fixtureCards(fav.fixtures.slice(0, 2), r)}`;
}

/* ─── Plain text ─── */

function textBlock(title: string, lines: string[]): string {
  return lines.length ? `\n${title.toUpperCase()}\n${lines.join('\n')}\n` : '';
}

function textFooter(r: Recipient): string {
  return `\n—\nCriczApp · Every run. Every ball. Live.\nUnsubscribe: ${r.unsubscribeUrl}`;
}

const resultLine = (x: ResultRow) =>
  `- ${x.home.name} ${x.home.score || ''} vs ${x.away.name} ${x.away.score || ''}${x.result ? ` — ${x.result}` : ''}`;
const fixtureLine = (f: FixtureRow) => `- ${f.home} vs ${f.away} · ${formatPkt(f.startsAt)}`;

/* ─── Newsletters ─── */

export type DigestContent = {
  date: Date;
  stories: Story[];
  pakistanStories: Story[];
  results: ResultRow[];
  fixtures: FixtureRow[];
};

/** Daily digest: lead story, top headlines, Pakistan news, results and today's fixtures. */
export function renderDailyDigest(c: DigestContent, r: Recipient, now = new Date()): RenderedNewsletter {
  const [lead, ...rest] = c.stories;
  const more = Math.max(0, c.stories.length - 1);
  const subject = lead
    ? `${lead.title}${more ? ` (+${more} more)` : ''} — CriczApp`
    : `Today in cricket · ${editionDate(c.date)} — CriczApp`;
  const preheader = c.results[0]?.result
    ? `${c.results[0].result}. Plus today's fixtures.`
    : 'Today’s cricket stories, results and fixtures.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: `Daily · ${editionDate(c.date)}`,
    reason: 'You receive the daily digest because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro(`Today in cricket`, `Here’s what happened overnight and what’s coming up today.`)}
${lead ? leadStory(lead, r, now) : ''}
${rest.length ? `${sectionTitle('More headlines')}${storyList(rest.slice(0, 4), r, now)}` : ''}
${c.pakistanStories.length ? `${sectionTitle('Pakistan cricket')}${storyList(c.pakistanStories.slice(0, 3), r, now)}` : ''}
${favouritesBlock(r)}
${c.results.length ? `${sectionTitle('Latest results')}${resultCards(c.results.slice(0, 4), r)}` : ''}
${c.fixtures.length ? `${sectionTitle("Today's fixtures")}${fixtureCards(c.fixtures.slice(0, 4), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/news`), 'Read more on CriczApp')}`,
  });
  const text = `Today in cricket · ${editionDate(c.date)}
${textBlock('Top stories', c.stories.slice(0, 5).map((s) => `- ${s.title}\n  ${s.url}`))}${textBlock('Results', c.results.slice(0, 4).map(resultLine))}${textBlock("Today's fixtures", c.fixtures.slice(0, 4).map(fixtureLine))}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

export type WeeklyContent = DigestContent & { weekLabel: string };

/** Weekly roundup: the week's biggest stories, all results, and the week ahead. */
export function renderWeeklyRoundup(c: WeeklyContent, r: Recipient, now = new Date()): RenderedNewsletter {
  const subject = `This week in cricket: ${c.results.length} results, ${c.stories.length} stories${c.stories[0] ? ` — "${truncate(c.stories[0].title, 48)}"` : ''}`;
  const preheader = c.fixtures.length
    ? `Plus ${c.fixtures.length} fixtures to watch in the week ahead.`
    : 'The stories, results and talking points from the last seven days.';
  const [lead, ...rest] = c.stories;
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: c.weekLabel,
    reason: 'You receive the weekly roundup because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro('This week in cricket', 'A quick look back at the biggest stories and results from the past seven days.')}
${lead ? leadStory(lead, r, now) : ''}
${rest.length ? `${sectionTitle('Stories of the week')}${storyList(rest.slice(0, 6), r, now)}` : ''}
${favouritesBlock(r)}
${c.results.length ? `${sectionTitle('Results this week')}${resultCards(c.results.slice(0, 6), r)}` : ''}
${c.fixtures.length ? `${sectionTitle('Coming up next week')}${fixtureCards(c.fixtures.slice(0, 5), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/schedules`), 'See full schedule')}`,
  });
  const text = `This week in cricket · ${c.weekLabel}
${textBlock('Stories of the week', c.stories.slice(0, 7).map((s) => `- ${s.title}\n  ${s.url}`))}${textBlock('Results', c.results.slice(0, 6).map(resultLine))}${textBlock('Coming up', c.fixtures.slice(0, 5).map(fixtureLine))}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

export type PreviewContent = {
  fixture: FixtureRow;
  prediction?: Prediction | null;
  /** Recent meetings, newest first. */
  headToHead?: ResultRow[];
  stories?: Story[];
};

/**
 * Match preview. Every claim comes directly from the prediction and the fixture.
 */
export function renderMatchPreview(c: PreviewContent, r: Recipient, now = new Date()): RenderedNewsletter {
  const f = c.fixture;
  const when = sameDay(f.startsAt, now) ? 'today' : `on ${f.startsAt.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'long' })}`;
  let subject = `${f.home} vs ${f.away} ${when} — Match preview`;
  if (c.prediction) {
    const [h, a] = splitPercent(c.prediction.homePct, c.prediction.awayPct);
    const fav = h >= a ? f.home : f.away;
    const favPct = Math.max(h, a);
    subject =
      favPct >= 60
        ? `${f.home} vs ${f.away} — ${fav} favoured at ${favPct}%`
        : `${f.home} vs ${f.away} (${h}%–${a}%) — Match preview`;
  }
  const preheader = `Starts ${formatPkt(f.startsAt)}${f.venue ? ` at ${f.venue}` : ''}. Preview, win probability and head-to-head inside.`;
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'Match preview',
    reason: 'You receive match previews because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${f.tournament ? `<div style="${FONT}font-size:12px;font-weight:600;color:${BRAND.green};">${escapeHtml(f.tournament)}</div>` : ''}
<h1 style="margin:6px 0;${FONT}font-size:23px;font-weight:700;letter-spacing:-0.02em;line-height:1.25;color:${BRAND.ink};">${escapeHtml(f.home)} <span style="color:${BRAND.muted};font-weight:400;">vs</span> ${escapeHtml(f.away)}</h1>
<p style="margin:0;${FONT}font-size:13.5px;color:${BRAND.muted};">${escapeHtml(formatPkt(f.startsAt))}${f.venue ? ` &middot; ${escapeHtml(f.venue)}` : ''}</p>
${c.prediction ? `${sectionTitle('Win probability')}${winBar(f.home, f.away, c.prediction)}<p style="margin:8px 0 0;${FONT}font-size:12.5px;line-height:1.55;color:${BRAND.muted};">Based on recent form, head-to-head record, and venue history. Statistical estimates, not guarantees.</p>` : ''}
${c.headToHead?.length ? `${sectionTitle('Recent meetings')}${resultCards(c.headToHead.slice(0, 3), r)}` : ''}
${c.stories?.length ? `${sectionTitle('Before the toss')}${storyList(c.stories.slice(0, 3), r, now)}` : ''}
${emailButton(r.link(f.url), 'Follow match live')}`,
  });
  const pred = c.prediction ? splitPercent(c.prediction.homePct, c.prediction.awayPct) : null;
  const text = `${f.home} vs ${f.away}
${f.tournament ? `${f.tournament}\n` : ''}Starts ${formatPkt(f.startsAt)}${f.venue ? ` · ${f.venue}` : ''}
${pred ? `\nWin probability: ${f.home} ${pred[0]}% · ${f.away} ${pred[1]}%\n` : ''}${textBlock('Recent meetings', (c.headToHead || []).slice(0, 3).map(resultLine))}
Follow live: ${f.url}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

export type PslContent = {
  seasonLabel: string;
  standings: StandingRow[];
  topRuns: LeaderRow[];
  topWickets: LeaderRow[];
  results: ResultRow[];
  fixtures: FixtureRow[];
};

/** PSL update: table, top performers, latest results and next fixtures. */
export function renderPslUpdate(c: PslContent, r: Recipient): RenderedNewsletter {
  const leader = c.standings[0];
  const fourth = c.standings[3];
  const fifth = c.standings[4];
  const gap = fourth && fifth ? fourth.points - fifth.points : null;
  const race =
    gap === 0
      ? ' — 4th and 5th level on points'
      : gap !== null && gap <= 2
        ? ` — ${gap} point${gap === 1 ? '' : 's'} between 4th and 5th`
        : '';
  const subject = leader
    ? `PSL: ${leader.team} lead the table${race}`
    : `${c.seasonLabel}: Standings & top performers`;
  const preheader = c.topRuns[0]
    ? `${c.topRuns[0].player} leads the run charts with ${c.topRuns[0].value} runs.`
    : 'Points table, top performers and the next fixtures.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'PSL update',
    reason: 'You receive PSL updates because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro(escapeHtml(c.seasonLabel), 'Current points table, leading performers, recent results, and upcoming matches.')}
${c.standings.length ? `${sectionTitle('Points table')}${standingsTable(c.standings.slice(0, 8))}` : ''}
${c.topRuns.length || c.topWickets.length ? `${sectionTitle('Top performers')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 -5px;"><tr>${leaderList('Most runs', c.topRuns.slice(0, 3), 'runs')}${leaderList('Most wickets', c.topWickets.slice(0, 3), 'wickets')}</tr></table>` : ''}
${c.results.length ? `${sectionTitle('Latest results')}${resultCards(c.results.slice(0, 3), r)}` : ''}
${c.fixtures.length ? `${sectionTitle('Next fixtures')}${fixtureCards(c.fixtures.slice(0, 3), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/psl`), 'Open PSL hub')}`,
  });
  const text = `${c.seasonLabel} update
${textBlock('Points table', c.standings.slice(0, 8).map((s) => `${s.rank}. ${s.team} — ${s.points} pts (P${s.played} W${s.won} L${s.lost})`))}${textBlock('Most runs', c.topRuns.slice(0, 3).map((l) => `- ${l.player} ${l.value}`))}${textBlock('Most wickets', c.topWickets.slice(0, 3).map((l) => `- ${l.player} ${l.value}`))}${textBlock('Next fixtures', c.fixtures.slice(0, 3).map(fixtureLine))}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

/** Breaking news: one verified story, chosen by an editor. */
export function renderBreakingNews(c: { story: Story; related?: Story[] }, r: Recipient, now = new Date()): RenderedNewsletter {
  const subject = `Breaking: ${c.story.title}`;
  const preheader = c.story.summary ? truncate(c.story.summary, 110) : 'A major cricket story is developing.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'Breaking',
    reason: 'You receive breaking news because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
<div style="${FONT}font-size:12px;font-weight:700;color:#DC2626;margin-bottom:6px;">Breaking news</div>
<h1 style="margin:0 0 10px;${FONT}font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${BRAND.ink};">${escapeHtml(c.story.title)}</h1>
${c.story.summary ? `<p style="margin:0;${FONT}font-size:15px;line-height:1.6;color:${BRAND.body};">${escapeHtml(c.story.summary)}</p>` : ''}
${emailButton(r.link(c.story.url), 'Read full story')}
${c.related?.length ? `${sectionTitle('Related stories')}${storyList(c.related.slice(0, 3), r, now)}` : ''}`,
  });
  const text = `BREAKING: ${c.story.title}
${c.story.summary ? `\n${c.story.summary}\n` : ''}
Read more: ${c.story.url}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

/** Re-engagement: a concise catch-up for subscribers who have gone quiet. */
export function renderReengagement(c: { stories: Story[]; fixtures: FixtureRow[] }, r: Recipient, now = new Date()): RenderedNewsletter {
  const subject = 'What you missed on CriczApp';
  const preheader = c.stories[0] ? `Including: ${truncate(c.stories[0].title, 80)}` : 'The biggest cricket stories since you last visited.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'Catch-up',
    reason: 'You receive this because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro('What you missed', 'Here are the stories and upcoming fixtures since you last checked in.')}
${c.stories.length ? `${sectionTitle('Top stories')}${storyList(c.stories.slice(0, 5), r, now)}` : ''}
${c.fixtures.length ? `${sectionTitle('Upcoming fixtures')}${fixtureCards(c.fixtures.slice(0, 3), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/`), 'Open CriczApp')}
<p style="margin:0;${FONT}font-size:12.5px;line-height:1.55;color:${BRAND.muted};">Not interested anymore? You can unsubscribe below at any time.</p>`,
  });
  const text = `Here's what you missed on CriczApp
${textBlock('Top stories', c.stories.slice(0, 5).map((s) => `- ${s.title}\n  ${s.url}`))}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

function sameDay(a: Date, b: Date): boolean {
  const day = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
  return day(a) === day(b);
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
