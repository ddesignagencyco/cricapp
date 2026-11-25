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

const FONT = `font-family:${EMAIL_FONT};`;

function sectionTitle(label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 12px;">
  <tr><td style="${FONT}font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${BRAND.navy};border-bottom:2px solid ${BRAND.green};padding-bottom:6px;">${escapeHtml(label)}</td></tr>
</table>`;
}

function intro(heading: string, body: string): string {
  return `<h1 style="margin:0 0 6px;${FONT}font-size:22px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;color:${BRAND.ink};">${heading}</h1>
<p style="margin:0;${FONT}font-size:14px;line-height:1.6;color:${BRAND.body};">${body}</p>`;
}

/** Lead story card: clean white/soft-tinted editorial box with a crisp left green rule. */
function leadStory(story: Story, r: Recipient, now: Date): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 6px;">
  <tr><td bgcolor="${BRAND.softBg}" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-left:3px solid ${BRAND.green};border-radius:4px;padding:18px 20px;">
    <div style="${FONT}font-size:11px;font-weight:700;letter-spacing:0.9px;text-transform:uppercase;color:${BRAND.green};">${escapeHtml(story.category || 'Lead Story')}${story.publishedAt ? ` &middot; ${timeAgo(story.publishedAt, now)}` : ''}</div>
    <a href="${r.link(story.url)}" style="display:block;margin-top:6px;${FONT}font-size:19px;line-height:1.35;font-weight:700;letter-spacing:-0.2px;color:${BRAND.ink};text-decoration:none;">${escapeHtml(story.title)}</a>
    ${story.summary ? `<p style="margin:8px 0 0;${FONT}font-size:13.5px;line-height:1.55;color:${BRAND.body};">${escapeHtml(story.summary)}</p>` : ''}
    <a href="${r.link(story.url)}" style="display:inline-block;margin-top:12px;${FONT}font-size:13px;font-weight:600;color:${BRAND.green};text-decoration:none;">Read full story &rarr;</a>
  </td></tr>
</table>`;
}

/** Numbered editorial headline rows. */
function storyList(stories: Story[], r: Recipient, now: Date, startAt = 1): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${stories
  .map(
    (s, i) => `  <tr>
    <td valign="top" style="width:30px;padding:12px 0;border-bottom:1px solid ${BRAND.border};font-family:${EMAIL_MONO};font-size:14px;font-weight:700;color:${BRAND.muted};">${String(i + startAt).padStart(2, '0')}</td>
    <td valign="top" style="padding:12px 0;border-bottom:1px solid ${BRAND.border};${FONT}">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(s.category || 'News')}${s.publishedAt ? ` &middot; ${timeAgo(s.publishedAt, now)}` : ''}</div>
      <a href="${r.link(s.url)}" style="display:block;margin-top:3px;font-size:15px;line-height:1.4;font-weight:600;color:${BRAND.ink};text-decoration:none;">${escapeHtml(s.title)}</a>
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
        <td style="${FONT}font-size:14px;padding:3px 0;color:${won ? BRAND.ink : BRAND.body};font-weight:${won ? 700 : 500};">${escapeHtml(t.name)}</td>
        <td align="right" style="font-family:${EMAIL_MONO};font-size:14px;padding:3px 0;color:${BRAND.ink};font-weight:${won ? 700 : 500};">${escapeHtml(t.score || '—')}</td>
      </tr>`;
      };
      return `<a href="${r.link(row.url)}" style="text-decoration:none;display:block;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border:1px solid ${BRAND.border};border-radius:4px;background:#FFFFFF;">
  <tr><td style="padding:12px 14px;">
    ${row.tournament ? `<div style="${FONT}font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.muted};margin-bottom:4px;">${escapeHtml(row.tournament)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${team('home')}${team('away')}</table>
    ${row.result ? `<div style="${FONT}font-size:12.5px;font-weight:600;color:${BRAND.green};margin-top:6px;">${escapeHtml(row.result)}</div>` : ''}
  </td></tr>
</table></a>`;
    })
    .join('\n');
}

function fixtureCards(rows: FixtureRow[], r: Recipient): string {
  return rows
    .map(
      (f) => `<a href="${r.link(f.url)}" style="text-decoration:none;display:block;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border:1px solid ${BRAND.border};border-radius:4px;background:#FFFFFF;">
  <tr>
    <td style="padding:12px 14px;${FONT}">
      ${f.tournament ? `<div style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(f.tournament)}</div>` : ''}
      <div style="margin-top:3px;font-size:14.5px;font-weight:700;color:${BRAND.ink};">${escapeHtml(f.home)} <span style="color:${BRAND.muted};font-weight:500;">vs</span> ${escapeHtml(f.away)}</div>
      ${f.venue ? `<div style="margin-top:2px;font-size:12px;color:${BRAND.muted};">${escapeHtml(f.venue)}</div>` : ''}
    </td>
    <td align="right" valign="middle" style="padding:12px 14px;${FONT}white-space:nowrap;">
      <div style="display:inline-block;background:#F8FAFC;border:1px solid ${BRAND.border};color:${BRAND.ink};border-radius:4px;padding:5px 9px;font-size:11.5px;font-weight:600;">${escapeHtml(formatPkt(f.startsAt))}</div>
    </td>
  </tr>
</table></a>`,
    )
    .join('\n');
}

/** Sleek flat win probability split bar: brand emerald vs muted slate. */
function winBar(homeName: string, awayName: string, p: Prediction): string {
  const [h, a] = splitPercent(p.homePct, p.awayPct);
  const homeCell = Math.max(h, 8);
  const awayCell = Math.max(a, 8);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 6px;">
  <tr>
    <td style="${FONT}font-size:13.5px;font-weight:700;color:${BRAND.green};">${escapeHtml(homeName)} ${h}%</td>
    <td align="right" style="${FONT}font-size:13.5px;font-weight:700;color:${BRAND.body};">${a}% ${escapeHtml(awayName)}</td>
  </tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:3px;overflow:hidden;">
  <tr>
    <td width="${homeCell}%" bgcolor="${BRAND.green}" style="background:${BRAND.green};height:8px;font-size:0;line-height:0;">&nbsp;</td>
    <td width="${awayCell}%" bgcolor="#94A3B8" style="background:#94A3B8;height:8px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>
</table>`;
}

function standingsTable(rows: StandingRow[]): string {
  const th = (t: string, align = 'center') =>
    `<th align="${align}" style="${FONT}font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#FFFFFF;padding:9px 6px;">${t}</th>`;
  const td = (t: string | number, align = 'center', bold = false, mono = false) =>
    `<td align="${align}" style="${mono ? `font-family:${EMAIL_MONO};` : FONT}font-size:13px;color:${BRAND.ink};padding:8px 6px;border-bottom:1px solid ${BRAND.border};font-weight:${bold ? 700 : 500};">${t}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.border};border-radius:4px;overflow:hidden;">
  <tr bgcolor="${BRAND.navy}" style="background:${BRAND.navy};">${th('#')}${th('Team', 'left')}${th('P')}${th('W')}${th('L')}${th('NRR')}${th('Pts')}</tr>
  ${rows
    .map(
      (r) =>
        `<tr${r.rank <= 4 ? ` bgcolor="${BRAND.softBg}" style="background:${BRAND.softBg};"` : ''}>${td(r.rank, 'center', false, true)}${td(escapeHtml(r.team), 'left', true)}${td(r.played, 'center', false, true)}${td(r.won, 'center', false, true)}${td(r.lost, 'center', false, true)}${td(`${r.nrr > 0 ? '+' : ''}${r.nrr.toFixed(3)}`, 'center', false, true)}${td(r.points, 'center', true, true)}</tr>`,
    )
    .join('')}
</table>
<p style="margin:6px 0 0;${FONT}font-size:11.5px;color:${BRAND.muted};">Shaded rows indicate playoff qualification places.</p>`;
}

function leaderList(title: string, rows: LeaderRow[], unit: string): string {
  return `<td valign="top" width="50%" style="padding:0 5px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.border};border-radius:4px;overflow:hidden;">
    <tr><td colspan="2" bgcolor="#F8FAFC" style="background:#F8FAFC;${FONT}font-size:11px;font-weight:700;color:${BRAND.navy};padding:9px 12px;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid ${BRAND.border};">${title}</td></tr>
    ${rows
      .map(
        (l) => `<tr>
      <td style="${FONT}font-size:13px;color:${BRAND.ink};padding:7px 12px;border-top:1px solid ${BRAND.border};"><strong>${escapeHtml(l.player)}</strong>${l.team ? `<br><span style="color:${BRAND.muted};font-size:11.5px;">${escapeHtml(l.team)}</span>` : ''}</td>
      <td align="right" style="font-family:${EMAIL_MONO};font-size:14px;font-weight:700;color:${BRAND.ink};padding:7px 12px;border-top:1px solid ${BRAND.border};white-space:nowrap;">${l.value} <span style="font-family:${EMAIL_FONT};font-size:11px;color:${BRAND.muted};font-weight:500;">${unit}</span></td>
    </tr>`,
      )
      .join('')}
  </table>
</td>`;
}

function favouritesBlock(r: Recipient): string {
  const fav = r.favourites;
  if (!fav || (!fav.results.length && !fav.fixtures.length)) return '';
  return `${sectionTitle(`Your Teams · ${fav.teams.slice(0, 3).join(', ')}`)}
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
    ? `${lead.title}${more ? ` (+${more} more)` : ''} — CriczApp Daily`
    : `Today in Cricket · ${editionDate(c.date)} — CriczApp`;
  const preheader = c.results[0]?.result
    ? `${c.results[0].result}. Plus today's key fixtures.`
    : 'The stories, results and fixtures that matter today.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: `Daily Digest · ${editionDate(c.date)}`,
    reason: 'You receive the daily digest because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro('Morning Cricket Briefing', 'Top stories, recent results, and the fixtures to watch today.')}
${lead ? leadStory(lead, r, now) : ''}
${rest.length ? `${sectionTitle('Top Headlines')}${storyList(rest.slice(0, 4), r, now, 2)}` : ''}
${c.pakistanStories.length ? `${sectionTitle('Pakistan Cricket')}${storyList(c.pakistanStories.slice(0, 3), r, now)}` : ''}
${favouritesBlock(r)}
${c.results.length ? `${sectionTitle('Latest Results')}${resultCards(c.results.slice(0, 4), r)}` : ''}
${c.fixtures.length ? `${sectionTitle("Today's Fixtures")}${fixtureCards(c.fixtures.slice(0, 4), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/news`), 'Read More on CriczApp')}`,
  });
  const text = `Today in cricket · ${editionDate(c.date)}
${textBlock('Top stories', c.stories.slice(0, 5).map((s) => `- ${s.title}\n  ${s.url}`))}${textBlock('Results', c.results.slice(0, 4).map(resultLine))}${textBlock("Today's fixtures", c.fixtures.slice(0, 4).map(fixtureLine))}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

export type WeeklyContent = DigestContent & { weekLabel: string };

/** Weekly roundup: the week's biggest stories, all results, and the week ahead. */
export function renderWeeklyRoundup(c: WeeklyContent, r: Recipient, now = new Date()): RenderedNewsletter {
  const subject = `Your Week in Cricket: ${c.results.length} results, ${c.stories.length} stories${c.stories[0] ? ` — "${truncate(c.stories[0].title, 48)}"` : ''}`;
  const preheader = c.fixtures.length
    ? `Plus ${c.fixtures.length} fixtures to watch in the week ahead.`
    : 'The stories, results and talking points from the last seven days.';
  const [lead, ...rest] = c.stories;
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: `Weekly Roundup · ${c.weekLabel}`,
    reason: 'You receive the weekly roundup because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro('The Week in Cricket', 'Key stories, match results, and upcoming fixtures from the past seven days.')}
${lead ? leadStory(lead, r, now) : ''}
${rest.length ? `${sectionTitle('Stories of the Week')}${storyList(rest.slice(0, 6), r, now, 2)}` : ''}
${favouritesBlock(r)}
${c.results.length ? `${sectionTitle('Results This Week')}${resultCards(c.results.slice(0, 6), r)}` : ''}
${c.fixtures.length ? `${sectionTitle('Coming Up Next Week')}${fixtureCards(c.fixtures.slice(0, 5), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/schedules`), 'See Full Schedule')}`,
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
 * Match preview. Every claim comes directly from the prediction and the fixture.
 */
export function renderMatchPreview(c: PreviewContent, r: Recipient, now = new Date()): RenderedNewsletter {
  const f = c.fixture;
  const when = sameDay(f.startsAt, now) ? 'today' : `on ${f.startsAt.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'long' })}`;
  let subject = `Match Preview: ${f.home} vs ${f.away} ${when}`;
  if (c.prediction) {
    const [h, a] = splitPercent(c.prediction.homePct, c.prediction.awayPct);
    const fav = h >= a ? f.home : f.away;
    const favPct = Math.max(h, a);
    subject =
      favPct >= 60
        ? `Match Preview: ${f.home} vs ${f.away} — ${fav} favoured at ${favPct}%`
        : `Match Preview: ${f.home} vs ${f.away} (${h}%–${a}%)`;
  }
  const preheader = `Starts ${formatPkt(f.startsAt)}${f.venue ? ` at ${f.venue}` : ''}. Preview, win probability and head-to-head inside.`;
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'Match Preview',
    reason: 'You receive match previews because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${f.tournament ? `<div style="${FONT}font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${BRAND.green};text-align:center;">${escapeHtml(f.tournament)}</div>` : ''}
<h1 style="margin:8px 0 6px;${FONT}font-size:26px;font-weight:700;letter-spacing:-0.3px;line-height:1.25;color:${BRAND.ink};text-align:center;">${escapeHtml(f.home)} <span style="color:${BRAND.muted};font-size:18px;font-weight:500;">vs</span> ${escapeHtml(f.away)}</h1>
<p style="margin:0;${FONT}font-size:13px;color:${BRAND.muted};text-align:center;">${escapeHtml(formatPkt(f.startsAt))}${f.venue ? ` &nbsp;&middot;&nbsp; ${escapeHtml(f.venue)}` : ''}</p>
${c.prediction ? `${sectionTitle('Win Probability')}${winBar(f.home, f.away, c.prediction)}<p style="margin:10px 0 0;${FONT}font-size:12.5px;line-height:1.55;color:${BRAND.muted};">Based on recent form, head-to-head record, and venue history. Predictions are statistical estimates, not certainties.</p>` : ''}
${c.headToHead?.length ? `${sectionTitle('Recent Meetings')}${resultCards(c.headToHead.slice(0, 3), r)}` : ''}
${c.stories?.length ? `${sectionTitle('Pre-Match Reading')}${storyList(c.stories.slice(0, 3), r, now)}` : ''}
${emailButton(r.link(f.url), 'Follow Match Live')}`,
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
    ? `PSL Update: ${leader.team} lead the table${race}`
    : `${c.seasonLabel} Update: Standings & Top Performers`;
  const preheader = c.topRuns[0]
    ? `${c.topRuns[0].player} leads the run charts with ${c.topRuns[0].value} runs. Full standings inside.`
    : 'Points table, top performers and the next fixtures.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'PSL Update',
    reason: 'You receive PSL updates because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro(`${escapeHtml(c.seasonLabel)} Update`, 'Current standings, statistical leaders, recent results, and upcoming fixtures.')}
${c.standings.length ? `${sectionTitle('Points Table')}${standingsTable(c.standings.slice(0, 8))}` : ''}
${c.topRuns.length || c.topWickets.length ? `${sectionTitle('Top Performers')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 -5px;"><tr>${leaderList('Most Runs', c.topRuns.slice(0, 3), 'runs')}${leaderList('Most Wickets', c.topWickets.slice(0, 3), 'wickets')}</tr></table>` : ''}
${c.results.length ? `${sectionTitle('Latest Results')}${resultCards(c.results.slice(0, 3), r)}` : ''}
${c.fixtures.length ? `${sectionTitle('Next Fixtures')}${fixtureCards(c.fixtures.slice(0, 3), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/psl`), 'Open PSL Hub')}`,
  });
  const text = `${c.seasonLabel} update
${textBlock('Points table', c.standings.slice(0, 8).map((s) => `${s.rank}. ${s.team} — ${s.points} pts (P${s.played} W${s.won} L${s.lost})`))}${textBlock('Most runs', c.topRuns.slice(0, 3).map((l) => `- ${l.player} ${l.value}`))}${textBlock('Most wickets', c.topWickets.slice(0, 3).map((l) => `- ${l.player} ${l.value}`))}${textBlock('Next fixtures', c.fixtures.slice(0, 3).map(fixtureLine))}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

/** Breaking news: one verified story, chosen by an editor. */
export function renderBreakingNews(c: { story: Story; related?: Story[] }, r: Recipient, now = new Date()): RenderedNewsletter {
  const subject = `Breaking: ${c.story.title}`;
  const preheader = c.story.summary ? truncate(c.story.summary, 110) : 'A major cricket story is developing. Read the details.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'Breaking News',
    reason: 'You receive breaking news because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
<div style="display:inline-block;background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;border-radius:4px;padding:4px 10px;${FONT}font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Breaking News</div>
<h1 style="margin:12px 0 8px;${FONT}font-size:23px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;color:${BRAND.ink};">${escapeHtml(c.story.title)}</h1>
${c.story.summary ? `<p style="margin:0;${FONT}font-size:15px;line-height:1.6;color:${BRAND.body};">${escapeHtml(c.story.summary)}</p>` : ''}
${emailButton(r.link(c.story.url), 'Read Full Story')}
${c.related?.length ? `${sectionTitle('Related Coverage')}${storyList(c.related.slice(0, 3), r, now)}` : ''}`,
  });
  const text = `BREAKING: ${c.story.title}
${c.story.summary ? `\n${c.story.summary}\n` : ''}
Read more: ${c.story.url}${textFooter(r)}`;
  return { subject, preheader, html, text };
}

/** Re-engagement: a concise catch-up for subscribers who have gone quiet. */
export function renderReengagement(c: { stories: Story[]; fixtures: FixtureRow[] }, r: Recipient, now = new Date()): RenderedNewsletter {
  const subject = 'CriczApp Catch-Up: Top Cricket Stories & Upcoming Matches';
  const preheader = c.stories[0] ? `Including: ${truncate(c.stories[0].title, 80)}` : 'The biggest cricket stories since you last visited.';
  const html = renderEmail({
    appUrl: r.appUrl,
    title: subject,
    preheader,
    edition: 'Catch-Up',
    reason: 'You receive this because you subscribed to the CriczApp newsletter.',
    unsubscribeUrl: r.unsubscribeUrl,
    preferencesUrl: r.preferencesUrl,
    bodyHtml: `
${intro('Catch Up on CriczApp', 'Here are the key headlines and upcoming fixtures you may have missed.')}
${c.stories.length ? `${sectionTitle('Top Stories')}${storyList(c.stories.slice(0, 5), r, now)}` : ''}
${c.fixtures.length ? `${sectionTitle('Upcoming Fixtures')}${fixtureCards(c.fixtures.slice(0, 3), r)}` : ''}
${emailButton(r.link(`${r.appUrl}/`), 'Visit CriczApp')}
<p style="margin:0;${FONT}font-size:12px;line-height:1.55;color:${BRAND.muted};text-align:center;">No longer interested? You can manage your preferences or unsubscribe below.</p>`,
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
