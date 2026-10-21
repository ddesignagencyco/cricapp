import { BRAND, emailButton, escapeHtml, renderEmail } from '../mailer/email-layout.js';

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
  if (mins < 60) return `${mins} min ago`;
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

/* ─── Building blocks ─── */

const FONT = 'font-family:Segoe UI,Arial,sans-serif;';

function sectionTitle(label: string, emoji: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 12px;">
  <tr><td style="${FONT}font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${BRAND.blue};border-bottom:2px solid ${BRAND.blue};padding-bottom:8px;">${emoji}&nbsp; ${escapeHtml(label)}</td></tr>
</table>`;
}

function intro(heading: string, body: string): string {
  return `<h1 style="margin:0 0 8px;${FONT}font-size:26px;line-height:1.25;color:${BRAND.ink};">${heading}</h1>
<p style="margin:0;${FONT}font-size:15px;line-height:1.6;color:${BRAND.body};">${body}</p>`;
}

/** The lead story: a tinted card with a big headline. */
function leadStory(story: Story, r: Recipient, now: Date): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px;">
  <tr><td bgcolor="#EEF3FF" style="background:#EEF3FF;border-radius:14px;padding:22px 22px 20px;border-left:5px solid ${BRAND.blue};">
    <div style="${FONT}font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.blue};">${escapeHtml(story.category || 'Top story')}${story.publishedAt ? ` · ${timeAgo(story.publishedAt, now)}` : ''}</div>
    <a href="${r.link(story.url)}" style="display:block;margin-top:8px;${FONT}font-size:21px;line-height:1.3;font-weight:800;color:${BRAND.ink};text-decoration:none;">${escapeHtml(story.title)}</a>
    ${story.summary ? `<p style="margin:8px 0 0;${FONT}font-size:14px;line-height:1.55;color:${BRAND.body};">${escapeHtml(story.summary)}</p>` : ''}
    <a href="${r.link(story.url)}" style="display:inline-block;margin-top:12px;${FONT}font-size:14px;font-weight:700;color:${BRAND.blue};text-decoration:none;">Read the full story &rarr;</a>
  </td></tr>
</table>`;
}

/** Numbered headline rows, like a news site's "most read". */
function storyList(stories: Story[], r: Recipient, now: Date, startAt = 1): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${stories
  .map(
    (s, i) => `  <tr>
    <td valign="top" style="width:38px;padding:14px 0;border-bottom:1px solid ${BRAND.border};${FONT}font-size:24px;font-weight:900;color:#C7D4FF;">${i + startAt}</td>
    <td valign="top" style="padding:14px 0;border-bottom:1px solid ${BRAND.border};${FONT}">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(s.category || 'News')}${s.publishedAt ? ` · ${timeAgo(s.publishedAt, now)}` : ''}</div>
      <a href="${r.link(s.url)}" style="display:block;margin-top:4px;font-size:16px;line-height:1.4;font-weight:700;color:${BRAND.ink};text-decoration:none;">${escapeHtml(s.title)}</a>
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
        <td style="${FONT}font-size:15px;padding:3px 0;color:${BRAND.ink};font-weight:${won ? 800 : 500};">${won ? '🏆 ' : ''}${escapeHtml(t.name)}</td>
        <td align="right" style="${FONT}font-size:15px;padding:3px 0;color:${BRAND.ink};font-weight:${won ? 800 : 600};font-family:Consolas,Menlo,monospace;">${escapeHtml(t.score || '—')}</td>
      </tr>`;
      };
      return `<a href="${r.link(row.url)}" style="text-decoration:none;display:block;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;border:1px solid ${BRAND.border};border-radius:12px;">
  <tr><td style="padding:12px 16px;">
    ${row.tournament ? `<div style="${FONT}font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.muted};margin-bottom:4px;">${escapeHtml(row.tournament)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${team('home')}${team('away')}</table>
    ${row.result ? `<div style="${FONT}font-size:13px;font-weight:700;color:${BRAND.blue};margin-top:6px;">${escapeHtml(row.result)}</div>` : ''}
  </td></tr>
</table></a>`;
    })
    .join('\n');
}

function fixtureCards(rows: FixtureRow[], r: Recipient): string {
  return rows
    .map(
      (f) => `<a href="${r.link(f.url)}" style="text-decoration:none;display:block;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;border:1px solid ${BRAND.border};border-radius:12px;">
  <tr>
    <td style="padding:12px 16px;${FONT}">
      ${f.tournament ? `<div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(f.tournament)}</div>` : ''}
      <div style="margin-top:4px;font-size:16px;font-weight:800;color:${BRAND.ink};">${escapeHtml(f.home)} <span style="color:${BRAND.muted};font-weight:600;">vs</span> ${escapeHtml(f.away)}</div>
      ${f.venue ? `<div style="margin-top:2px;font-size:13px;color:${BRAND.muted};">📍 ${escapeHtml(f.venue)}</div>` : ''}
    </td>
    <td align="right" valign="middle" style="padding:12px 16px;${FONT}white-space:nowrap;">
      <div style="display:inline-block;background:#EEF3FF;color:${BRAND.blue};border-radius:8px;padding:6px 10px;font-size:12px;font-weight:800;">${escapeHtml(formatPkt(f.startsAt))}</div>
    </td>
  </tr>
</table></a>`,
    )
    .join('\n');
}

/** A two-colour bar: the home share in brand blue, the away share in slate. */
function winBar(homeName: string, awayName: string, p: Prediction): string {
  const [h, a] = splitPercent(p.homePct, p.awayPct);
  const homeCell = Math.max(h, 8);
  const awayCell = Math.max(a, 8);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;">
  <tr>
    <td style="${FONT}font-size:14px;font-weight:800;color:${BRAND.blue};">${escapeHtml(homeName)} ${h}%</td>
    <td align="right" style="${FONT}font-size:14px;font-weight:800;color:#475569;">${a}% ${escapeHtml(awayName)}</td>
  </tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:999px;overflow:hidden;">
  <tr>
    <td width="${homeCell}%" bgcolor="${BRAND.blue}" style="background:${BRAND.blue};height:12px;font-size:0;line-height:0;">&nbsp;</td>
    <td width="${awayCell}%" bgcolor="#94A3B8" style="background:#94A3B8;height:12px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>
</table>`;
}

function standingsTable(rows: StandingRow[]): string {
  const th = (t: string, align = 'center') =>
    `<th align="${align}" style="${FONT}font-size:11px;font-weight:800;letter-spacing:0.6px;color:#FFFFFF;padding:8px 6px;">${t}</th>`;
  const td = (t: string | number, align = 'center', bold = false) =>
    `<td align="${align}" style="${FONT}font-size:14px;color:${BRAND.ink};padding:9px 6px;border-bottom:1px solid ${BRAND.border};font-weight:${bold ? 800 : 500};">${t}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
  <tr bgcolor="${BRAND.blue}" style="background:${BRAND.blue};">${th('#')}${th('Team', 'left')}${th('P')}${th('W')}${th('L')}${th('NRR')}${th('Pts')}</tr>
  ${rows
    .map(
      (r) =>
        `<tr${r.rank <= 4 ? ' bgcolor="#F5F8FF" style="background:#F5F8FF;"' : ''}>${td(r.rank)}${td(escapeHtml(r.team), 'left', true)}${td(r.played)}${td(r.won)}${td(r.lost)}${td(r.nrr.toFixed(3))}${td(r.points, 'center', true)}</tr>`,
    )
    .join('')}
</table>
<p style="margin:6px 0 0;${FONT}font-size:12px;color:${BRAND.muted};">Shaded: playoff places.</p>`;
}

function leaderList(title: string, rows: LeaderRow[], unit: string): string {
  return `<td valign="top" width="50%" style="padding:0 6px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.border};border-radius:12px;">
    <tr><td colspan="2" style="${FONT}font-size:12px;font-weight:800;color:${BRAND.blue};padding:10px 12px 4px;text-transform:uppercase;letter-spacing:0.8px;">${title}</td></tr>
    ${rows
      .map(
        (l) => `<tr>
      <td style="${FONT}font-size:13px;color:${BRAND.ink};padding:6px 12px;border-top:1px solid ${BRAND.border};"><strong>${escapeHtml(l.player)}</strong>${l.team ? `<br><span style="color:${BRAND.muted};font-size:12px;">${escapeHtml(l.team)}</span>` : ''}</td>
      <td align="right" style="${FONT}font-size:15px;font-weight:800;color:${BRAND.ink};padding:6px 12px;border-top:1px solid ${BRAND.border};white-space:nowrap;">${l.value} <span style="font-size:11px;color:${BRAND.muted};font-weight:600;">${unit}</span></td>
    </tr>`,
      )
      .join('')}
  </table>
</td>`;
}

function favouritesBlock(r: Recipient): string {
  const fav = r.favourites;
  if (!fav || (!fav.results.length && !fav.fixtures.length)) return '';
  return `${sectionTitle(`Your teams · ${fav.teams.slice(0, 3).join(', ')}`, '⭐')}
${resultCards(fav.results.slice(0, 2), r)}
${fixtureCards(fav.fixtures.slice(0, 2), r)}`;
}

/* ─── Plain text ─── */

function textBlock(title: string, lines: string[]): string {
  return lines.length ? `\n${title.toUpperCase()}\n${lines.join('\n')}\n` : '';
}

function textFooter(r: Recipient): string {
  return `\n—\nPakCricZone · Every run. Every ball. Live.\nUnsubscribe: ${r.unsubscribeUrl}`;
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
    ? `🏏 ${lead.title}${more ? ` (+${more} more)` : ''}`
    : `🏏 Today in cricket · ${editionDate(c.date)}`;
  const preheader = c.results[0]?.result
    ? `${c.results[0].result}. Plus the fixtures you can't miss today.`
    : 'The stories, results and fixtures that matter today.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: `Daily digest · ${editionDate(c.date)}`,
    reason: 'You receive the daily digest because you subscribed to the PakCricZone newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro('Good morning, cricket fans ☀️', 'Here is everything that happened, and what to watch today.')}
${lead ? leadStory(lead, r, now) : ''}
${rest.length ? `${sectionTitle('Top headlines', '🔥')}${storyList(rest.slice(0, 4), r, now, 2)}` : ''}
${c.pakistanStories.length ? `${sectionTitle('Pakistan cricket', '🇵🇰')}${storyList(c.pakistanStories.slice(0, 3), r, now)}` : ''}
${favouritesBlock(r)}
${c.results.length ? `${sectionTitle('Latest results', '🏆')}${resultCards(c.results.slice(0, 4), r)}` : ''}
${c.fixtures.length ? `${sectionTitle("Today's fixtures", '🗓️')}${fixtureCards(c.fixtures.slice(0, 4), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/news`), 'Read more on PakCricZone')}`,
  });
  const text = `Today in cricket · ${editionDate(c.date)}
${textBlock('Top stories', c.stories.slice(0, 5).map((s) => `- ${s.title}\n  ${s.url}`))}${textBlock('Results', c.results.slice(0, 4).map(resultLine))}${textBlock("Today's fixtures", c.fixtures.slice(0, 4).map(fixtureLine))}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

export type WeeklyContent = DigestContent & { weekLabel: string };

/** Weekly roundup: the week's biggest stories, all results, and the week ahead. */
export function renderWeeklyRoundup(c: WeeklyContent, r: Recipient, now = new Date()): RenderedNewsletter {
  const subject = `📅 Your week in cricket: ${c.results.length} results, ${c.stories.length} big stories${c.stories[0] ? ` — "${truncate(c.stories[0].title, 48)}"` : ''}`;
  const preheader = c.fixtures.length
    ? `Plus ${c.fixtures.length} fixtures to watch in the week ahead.`
    : 'The stories, results and talking points from the last seven days.';
  const [lead, ...rest] = c.stories;
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: `Weekly roundup · ${c.weekLabel}`,
    reason: 'You receive the weekly roundup because you subscribed to the PakCricZone newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro('The week in cricket 🗞️', 'Missed something? Here are the stories everyone talked about this week.')}
${lead ? leadStory(lead, r, now) : ''}
${rest.length ? `${sectionTitle('Stories of the week', '🔥')}${storyList(rest.slice(0, 6), r, now, 2)}` : ''}
${favouritesBlock(r)}
${c.results.length ? `${sectionTitle('Results this week', '🏆')}${resultCards(c.results.slice(0, 6), r)}` : ''}
${c.fixtures.length ? `${sectionTitle('Coming up next week', '🗓️')}${fixtureCards(c.fixtures.slice(0, 5), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/schedules`), 'See the full schedule')}`,
  });
  const text = `Your week in cricket · ${c.weekLabel}
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
 * Match preview. The subject is written to make people open it, but every word of it
 * comes from the prediction and the fixture — never a claim the email does not make.
 */
export function renderMatchPreview(c: PreviewContent, r: Recipient, now = new Date()): RenderedNewsletter {
  const f = c.fixture;
  const when = sameDay(f.startsAt, now) ? 'today' : `on ${f.startsAt.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'long' })}`;
  let subject = `⏰ ${f.home} vs ${f.away} ${when} — who takes it?`;
  if (c.prediction) {
    const [h, a] = splitPercent(c.prediction.homePct, c.prediction.awayPct);
    const fav = h >= a ? f.home : f.away;
    const dog = h >= a ? f.away : f.home;
    const favPct = Math.max(h, a);
    subject =
      favPct >= 60
        ? `⏰ ${f.home} vs ${f.away}: our model gives ${fav} ${favPct}%. Can ${dog} spoil it?`
        : `⏰ ${f.home} vs ${f.away} is too close to call (${h}–${a}). Here's why`;
  }
  const preheader = `Starts ${formatPkt(f.startsAt)}${f.venue ? ` at ${f.venue}` : ''}. Preview, prediction and head-to-head inside.`;
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'Match preview',
    reason: 'You receive match previews because you subscribed to the PakCricZone newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${f.tournament ? `<div style="${FONT}font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.blue};text-align:center;">${escapeHtml(f.tournament)}</div>` : ''}
<h1 style="margin:10px 0 6px;${FONT}font-size:30px;line-height:1.2;color:${BRAND.ink};text-align:center;">${escapeHtml(f.home)} <span style="color:${BRAND.muted};font-size:20px;">vs</span> ${escapeHtml(f.away)}</h1>
<p style="margin:0;${FONT}font-size:14px;color:${BRAND.body};text-align:center;">🕒 ${escapeHtml(formatPkt(f.startsAt))}${f.venue ? ` &nbsp;·&nbsp; 📍 ${escapeHtml(f.venue)}` : ''}</p>
${c.prediction ? `${sectionTitle('Who wins? Our prediction', '📊')}${winBar(f.home, f.away, c.prediction)}<p style="margin:10px 0 0;${FONT}font-size:13px;line-height:1.55;color:${BRAND.muted};">Based on recent form, head-to-head record and venue history. Predictions are statistical estimates, not certainties.</p>` : ''}
${c.headToHead?.length ? `${sectionTitle('Last meetings', '⚔️')}${resultCards(c.headToHead.slice(0, 3), r)}` : ''}
${c.stories?.length ? `${sectionTitle('Read before the toss', '📰')}${storyList(c.stories.slice(0, 3), r, now)}` : ''}
${emailButton(r.link(f.url), 'Follow it live')}`,
  });
  const pred = c.prediction ? splitPercent(c.prediction.homePct, c.prediction.awayPct) : null;
  const text = `${f.home} vs ${f.away}
${f.tournament ? `${f.tournament}\n` : ''}Starts ${formatPkt(f.startsAt)}${f.venue ? ` · ${f.venue}` : ''}
${pred ? `\nOur prediction: ${f.home} ${pred[0]}% · ${f.away} ${pred[1]}%\n` : ''}${textBlock('Last meetings', (c.headToHead || []).slice(0, 3).map(resultLine))}
Follow it live: ${f.url}${textFooter(r)}`;
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
      ? ' — 4th and 5th are level on points'
      : gap !== null && gap <= 2
        ? ` — only ${gap} point${gap === 1 ? '' : 's'} between 4th and 5th`
        : '';
  const subject = leader
    ? `🏆 PSL: ${leader.team} on top${race}. Who's in the playoff race?`
    : `🏆 ${c.seasonLabel}: the latest table and top performers`;
  const preheader = c.topRuns[0]
    ? `${c.topRuns[0].player} leads the run charts with ${c.topRuns[0].value}. Full table inside.`
    : 'Points table, top performers and the next fixtures.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'PSL update',
    reason: 'You receive PSL updates because you subscribed to the PakCricZone newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro(`${escapeHtml(c.seasonLabel)} 🏆`, 'Where every team stands, who is leading the charts, and what is next.')}
${c.standings.length ? `${sectionTitle('Points table', '📈')}${standingsTable(c.standings.slice(0, 8))}` : ''}
${c.topRuns.length || c.topWickets.length ? `${sectionTitle('Top performers', '⭐')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 -6px;"><tr>${leaderList('Most runs', c.topRuns.slice(0, 3), 'runs')}${leaderList('Most wickets', c.topWickets.slice(0, 3), 'wkts')}</tr></table>` : ''}
${c.results.length ? `${sectionTitle('Latest results', '🏏')}${resultCards(c.results.slice(0, 3), r)}` : ''}
${c.fixtures.length ? `${sectionTitle('Next fixtures', '🗓️')}${fixtureCards(c.fixtures.slice(0, 3), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/psl`), 'Open the PSL hub')}`,
  });
  const text = `${c.seasonLabel} update
${textBlock('Points table', c.standings.slice(0, 8).map((s) => `${s.rank}. ${s.team} — ${s.points} pts (P${s.played} W${s.won} L${s.lost})`))}${textBlock('Most runs', c.topRuns.slice(0, 3).map((l) => `- ${l.player} ${l.value}`))}${textBlock('Most wickets', c.topWickets.slice(0, 3).map((l) => `- ${l.player} ${l.value}`))}${textBlock('Next fixtures', c.fixtures.slice(0, 3).map(fixtureLine))}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

/** Breaking news: one verified story, chosen by an editor. */
export function renderBreakingNews(c: { story: Story; related?: Story[] }, r: Recipient, now = new Date()): RenderedNewsletter {
  const subject = `🚨 ${c.story.title}`;
  const preheader = c.story.summary ? truncate(c.story.summary, 110) : 'A major story is developing. Read the details.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'Breaking news',
    reason: 'You receive breaking news because you subscribed to the PakCricZone newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
<div style="display:inline-block;background:#FDECEC;color:#B42318;border-radius:999px;padding:5px 12px;${FONT}font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">● Breaking</div>
<h1 style="margin:14px 0 10px;${FONT}font-size:26px;line-height:1.25;color:${BRAND.ink};">${escapeHtml(c.story.title)}</h1>
${c.story.summary ? `<p style="margin:0;${FONT}font-size:16px;line-height:1.6;color:${BRAND.body};">${escapeHtml(c.story.summary)}</p>` : ''}
${emailButton(r.link(c.story.url), 'Read the full story')}
${c.related?.length ? `${sectionTitle('More on this', '📰')}${storyList(c.related.slice(0, 3), r, now)}` : ''}`,
  });
  const text = `BREAKING: ${c.story.title}
${c.story.summary ? `\n${c.story.summary}\n` : ''}
Read more: ${c.story.url}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

/** Re-engagement: a friendly catch-up for subscribers who have gone quiet. */
export function renderReengagement(c: { stories: Story[]; fixtures: FixtureRow[] }, r: Recipient, now = new Date()): RenderedNewsletter {
  const subject = `We saved you a seat 🏏 — here's what you missed`;
  const preheader = c.stories[0] ? `Including: ${truncate(c.stories[0].title, 80)}` : 'The biggest cricket stories since you last visited.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'Catch-up',
    reason: 'You receive this because you subscribed to the PakCricZone newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro('We miss you at the crease 👋', 'A lot has happened since you last checked in. Here are the highlights.')}
${c.stories.length ? `${sectionTitle("What you missed", '🔥')}${storyList(c.stories.slice(0, 5), r, now)}` : ''}
${c.fixtures.length ? `${sectionTitle('Coming up', '🗓️')}${fixtureCards(c.fixtures.slice(0, 3), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/`), 'Catch up on PakCricZone')}
<p style="margin:0;${FONT}font-size:13px;line-height:1.55;color:${BRAND.muted};text-align:center;">Not interested any more? No hard feelings — you can unsubscribe below.</p>`,
  });
  const text = `Here's what you missed on PakCricZone
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
