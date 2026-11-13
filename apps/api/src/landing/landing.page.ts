import type { LandingData, LandingServiceCard, ServiceStatus } from './landing.service.js';

const esc = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );

const fmt = (value: number): string => value.toLocaleString('en-US');

const fmtDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

const timeAgo = (iso: string | null): string => {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return 'unknown';
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const fmtDate = (iso: string | null): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  offline: 'Offline',
  idle: 'Idle',
  unconfigured: 'Not configured',
  unknown: 'Unknown',
};

const statusDot = (status: ServiceStatus): string =>
  `<span class="dot dot-${esc(status)}" aria-hidden="true"></span>`;

const serviceCard = (service: LandingServiceCard): string => `
  <article class="service-card">
    <div class="service-top">
      <h3>${esc(service.name)}</h3>
      <span class="chip chip-${esc(service.status)}">${statusDot(service.status)}${esc(
        STATUS_LABEL[service.status],
      )}</span>
    </div>
    <p class="service-role">${esc(service.role)}</p>
    <p class="service-detail">${esc(service.detail)}</p>
    <p class="service-meta">${esc(service.meta)}</p>
  </article>`;

const statCard = (
  label: string,
  value: string,
  hint: string,
  numeric?: number,
): string => {
  const countable = typeof numeric === 'number' && Number.isFinite(numeric);
  return `
  <div class="stat">
    <span class="stat-label">${esc(label)}</span>
    <span class="stat-value${countable ? ' js-count' : ''}"${
      countable ? ` data-value="${numeric}"` : ''
    }>${esc(value)}</span>
    <span class="stat-hint">${esc(hint)}</span>
  </div>`;
};

const codeBlock = (code: string, label: string): string => {
  const lines = code
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      const isComment = trimmed.startsWith('#') || trimmed.startsWith('//');
      const text = esc(line);
      return isComment
        ? `<span class="cmt">${text}</span>`
        : `<span>${text || '&nbsp;'}</span>`;
    })
    .join('\n');

  return `
  <div class="code-wrap">
    <div class="code-head">
      <span>${esc(label)}</span>
      <button class="copy-btn" type="button" data-copy-target>Copy</button>
    </div>
    <pre class="code"><code>${lines}</code></pre>
  </div>`;
};

export function renderLandingPage(data: LandingData): string {
  const { runtime, database, redis, counts } = {
    runtime: data.runtime,
    database: data.database,
    redis: data.redis,
    counts: data.database.counts,
  };
  const ready = data.overall === 'operational';
  const uptime = fmtDuration(runtime.uptimeSeconds);
  const operationalCount = data.services.filter((s) => s.status === 'operational').length;
  const attentionCount = data.services.filter((s) =>
    ['degraded', 'offline', 'unknown'].includes(s.status),
  ).length;
  const operations = data.apiSurface ? fmt(data.apiSurface.operations) : '—';
  const paths = data.apiSurface ? fmt(data.apiSurface.paths) : '—';
  const tags = data.apiSurface?.tags ?? [];

  const dataStats = [
    statCard('Matches stored', counts ? fmt(counts.matches) : '—', 'Across every competition', counts?.matches),
    statCard('Live right now', counts ? fmt(counts.liveMatches) : '—', 'In-progress scoreboards', counts?.liveMatches),
    statCard('Completed', counts ? fmt(counts.completedMatches) : '—', 'Results archived', counts?.completedMatches),
    statCard('Upcoming', counts ? fmt(counts.upcomingMatches) : '—', 'Fixtures ahead', counts?.upcomingMatches),
    statCard('Teams', counts ? fmt(counts.teams) : '—', 'International & domestic', counts?.teams),
    statCard('Players', counts ? fmt(counts.players) : '—', 'Profiles with career data', counts?.players),
    statCard('Tournaments', counts ? fmt(counts.tournaments) : '—', 'Seasons & competitions', counts?.tournaments),
    statCard('Published stories', counts ? fmt(counts.publishedArticles) : '—', 'News & editorial', counts?.publishedArticles),
    statCard('Registered fans', counts ? fmt(counts.users) : '—', 'Accounts on the platform', counts?.users),
    statCard('Prediction runs', counts ? fmt(counts.predictions) : '—', 'Append-only model history', counts?.predictions),
    statCard('Gallery items', counts ? fmt(counts.gallery) : '—', 'Images, shorts, video', counts?.gallery),
  ].join('');

  const heroStats = [
    statCard('Uptime', uptime, 'Since this instance booted'),
    statCard('Requests served', fmt(data.requests.total), 'Process lifetime', data.requests.total),
    statCard(
      'Avg response',
      data.requests.avgMs < 1 ? '<1 ms' : `${data.requests.avgMs} ms`,
      `Peak ${data.requests.maxMs} ms`,
    ),
    statCard('API operations', operations, `${paths} documented paths`, data.apiSurface?.operations),
  ].join('');

  const statusRows = [
    {
      name: 'API server',
      status: 'operational' as ServiceStatus,
      detail: `Node ${runtime.node.replace(/^v/, '')}`,
    },
    {
      name: 'PostgreSQL',
      status: (database.ok ? 'operational' : 'offline') as ServiceStatus,
      detail: database.ok ? `${database.latencyMs} ms · ${database.version ?? 'connected'}` : 'unreachable',
    },
    {
      name: 'Redis',
      status: (redis.ok ? 'operational' : 'offline') as ServiceStatus,
      detail: redis.ok ? `${redis.latencyMs} ms · ${redis.version ?? 'connected'}` : 'unreachable',
    },
    {
      name: 'Ingestion',
      status: data.ingestion.status,
      detail:
        data.ingestion.heartbeatAgeMs === null
          ? 'no heartbeat'
          : `heartbeat ${Math.round(data.ingestion.heartbeatAgeMs / 1000)}s ago`,
    },
  ]
    .map(
      (row) => `
      <div class="status-row">
        <span class="status-name">${statusDot(row.status)}${esc(row.name)}</span>
        <span class="status-detail">${esc(row.detail)}</span>
      </div>`,
    )
    .join('');

  const stack = [
    `Node ${runtime.node.replace(/^v/, '')}`,
    'NestJS 10',
    'Prisma 7',
    database.version ?? 'PostgreSQL',
    redis.version ?? 'Redis',
    'Socket.IO 4',
    'Swagger / OpenAPI 3',
    `Docker · ${runtime.region === 'local' ? 'local' : 'Render'}`,
  ]
    .map((item) => `<span class="stack-chip">${esc(item)}</span>`)
    .join('');

  const baseUrl = data.baseUrl;
  const curlSnippet = `# Live matches, right now
curl -s ${baseUrl}/matches/live | jq

# Browse every documented route
curl -s ${data.openApiUrl} | jq '.paths | keys'`;
  const fetchSnippet = `// Auth uses an HttpOnly cookie after POST /api/auth/login
const res = await fetch('${baseUrl}/matches/live', {
  credentials: 'include',
  headers: { accept: 'application/json' },
});

const { data } = await res.json();
console.log(data.length, 'matches');`;

  const tagChips = tags.length
    ? tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')
    : '<span class="tag">Loading surface…</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CriczApp API — Platform status & developer portal</title>
<meta name="description" content="Live health, data volume and backend architecture of the CriczApp cricket API, plus the developer portal for REST and realtime integrations." />
<meta name="theme-color" content="#08111F" />
<meta property="og:title" content="CriczApp API — Platform status & developer portal" />
<meta property="og:description" content="Every ball, live from the backend. Service health, stored data and developer docs for the CriczApp API." />
<meta property="og:type" content="website" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%233B68FC'/%3E%3Ccircle cx='16' cy='16' r='8' fill='%23F8FAFC'/%3E%3Cpath d='M12.5 9.5c3 3.6 3 9.4 0 13M19.5 9.5c-3 3.6-3 9.4 0 13' stroke='%2308111F' stroke-width='1.2' fill='none'/%3E%3C/svg%3E" />
<style>
  :root {
    --bg: #08111F;
    --surface: #0E1A2B;
    --elevated: #142238;
    --border: #2A3B52;
    --border-strong: #3A4D67;
    --text: #F8FAFC;
    --text-2: #CBD5E1;
    --muted: #A8B4C5;
    --brand: #3B68FC;
    --brand-hover: #547CFF;
    --accent: #8BA4FF;
    --success: #34D399;
    --warning: #FBBF24;
    --danger: #FB7185;
    --live: #FB7185;
    --mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    --sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --radius: 14px;
    --shadow: 0 18px 50px rgb(0 0 0 / 0.35);
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; text-decoration: none; }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 6px; }
  ::selection { background: rgb(59 104 252 / 0.4); }
  .wrap { width: min(1180px, calc(100% - 40px)); margin: 0 auto; }
  .skip { position: absolute; left: -9999px; top: 0; background: var(--brand); color: #fff; padding: 10px 16px; z-index: 100; }
  .skip:focus { left: 16px; top: 16px; }

  /* ---------- top bar ---------- */
  .topbar {
    position: sticky; top: 0; z-index: 50;
    background: rgb(8 17 31 / 0.86);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(14px);
  }
  .topbar-inner { display: flex; align-items: center; gap: 20px; height: 68px; }
  .brand { display: flex; align-items: center; gap: 11px; font-weight: 700; letter-spacing: -0.02em; }
  .brand-mark {
    display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px;
    background: linear-gradient(145deg, var(--brand), #2447c8);
    box-shadow: 0 6px 18px rgb(59 104 252 / 0.35);
    color: var(--text);
  }
  .brand-mark svg { width: 22px; height: 22px; }
  .brand-name { font-size: 1.06rem; }
  .brand-name em { font-style: normal; color: var(--accent); }
  .brand-divider { width: 1px; height: 20px; background: var(--border-strong); }
  .brand-sub { color: var(--muted); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
  .topnav { display: flex; gap: 4px; margin-left: auto; }
  .topnav a {
    color: var(--muted); font-size: 0.84rem; font-weight: 500;
    padding: 7px 11px; border-radius: 8px; transition: color 160ms ease, background 160ms ease;
  }
  .topnav a:hover { color: var(--text); background: var(--elevated); }
  .pill {
    display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
    padding: 7px 12px; border-radius: 999px; font-size: 0.76rem; font-weight: 600;
    border: 1px solid rgb(52 211 153 / 0.35); background: rgb(52 211 153 / 0.1); color: #6EE7B7;
  }
  .pill.is-degraded { border-color: rgb(251 191 36 / 0.4); background: rgb(251 191 36 / 0.1); color: #FCD34D; }
  .pill.is-down { border-color: rgb(251 113 133 / 0.4); background: rgb(251 113 133 / 0.1); color: #FDA4AF; }

  .dot {
    width: 7px; height: 7px; border-radius: 999px; flex: none; display: inline-block;
    background: var(--muted);
  }
  .dot-operational { background: var(--success); box-shadow: 0 0 0 3px rgb(52 211 153 / 0.14); animation: pulse 2.4s ease-in-out infinite; }
  .dot-degraded { background: var(--warning); box-shadow: 0 0 0 3px rgb(251 191 36 / 0.14); }
  .dot-offline { background: var(--danger); box-shadow: 0 0 0 3px rgb(251 113 133 / 0.14); }
  .dot-idle { background: var(--accent); }
  .dot-unconfigured, .dot-unknown { background: #7E8CA0; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

  /* ---------- hero ---------- */
  .hero { position: relative; overflow: hidden; border-bottom: 1px solid var(--border); }
  .hero::before {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(700px 420px at 12% -10%, rgb(59 104 252 / 0.24), transparent 65%),
      radial-gradient(560px 360px at 88% 0%, rgb(251 113 133 / 0.09), transparent 65%),
      linear-gradient(180deg, transparent, rgb(8 17 31 / 0.4));
  }
  .hero::after {
    content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.25;
    background-image:
      linear-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 0.05) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: linear-gradient(180deg, rgb(0 0 0 / 0.55), transparent 78%);
  }
  .hero-inner {
    position: relative; z-index: 1;
    display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.9fr);
    gap: 48px; align-items: center; padding: 76px 0 64px;
  }
  .eyebrow {
    display: inline-flex; align-items: center; gap: 8px; margin: 0 0 18px;
    color: var(--accent); font-size: 0.74rem; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase;
  }
  .eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--accent); }
  h1 {
    margin: 0; font-size: clamp(2.4rem, 5.2vw, 4.05rem); line-height: 1.03;
    letter-spacing: -0.045em; font-weight: 800;
  }
  h1 .accent {
    background: linear-gradient(100deg, #8BA4FF 5%, #3B68FC 48%, #FB7185 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .lede {
    max-width: 590px; margin: 22px 0 0; color: var(--text-2);
    font-size: 1.03rem; line-height: 1.7;
  }
  .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 42px; padding: 0 18px; border-radius: 10px; font-size: 0.88rem;
    font-weight: 600; border: 1px solid transparent; cursor: pointer;
    transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn-primary { background: var(--brand); color: #fff; box-shadow: 0 10px 26px rgb(59 104 252 / 0.32); }
  .btn-primary:hover { background: var(--brand-hover); }
  .btn-ghost { border-color: var(--border-strong); background: rgb(20 34 56 / 0.65); color: var(--text); }
  .btn-ghost:hover { background: var(--elevated); border-color: #4A5F7D; }
  .btn svg { width: 15px; height: 15px; }

  .hero-kpis {
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1px; margin-top: 40px; padding: 1px;
    background: var(--border); border-radius: 12px; overflow: hidden;
  }
  .hero-kpis .stat { background: rgb(14 26 43 / 0.92); padding: 15px 16px; }
  .stat { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .stat-label { color: var(--muted); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; }
  .stat-value { font-size: 1.42rem; font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .stat-hint { color: var(--muted); font-size: 0.7rem; }

  .status-panel {
    position: relative; padding: 22px; border: 1px solid var(--border);
    border-radius: var(--radius); background: linear-gradient(180deg, rgb(20 34 56 / 0.92), rgb(14 26 43 / 0.96));
    box-shadow: var(--shadow);
  }
  .status-panel::before {
    content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    border-top: 1px solid rgb(139 164 255 / 0.35);
  }
  .status-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  .status-head h2 { margin: 0; font-size: 1rem; letter-spacing: -0.01em; }
  .status-head p { margin: 3px 0 0; color: var(--muted); font-size: 0.74rem; }
  .status-badge {
    display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 999px;
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    background: rgb(52 211 153 / 0.1); color: #6EE7B7; border: 1px solid rgb(52 211 153 / 0.3);
    white-space: nowrap;
  }
  .status-badge.is-degraded { background: rgb(251 191 36 / 0.1); color: #FCD34D; border-color: rgb(251 191 36 / 0.35); }
  .status-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px dashed rgb(42 59 82 / 0.75); }
  .status-row:last-of-type { border-bottom: 0; }
  .status-name { display: flex; align-items: center; gap: 9px; font-size: 0.84rem; font-weight: 600; }
  .status-detail { color: var(--muted); font-family: var(--mono); font-size: 0.68rem; text-align: right; }
  .status-foot { margin-top: 10px; padding-top: 14px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 0.68rem; }
  .status-foot code { color: var(--text-2); }

  /* ---------- sections ---------- */
  section { padding: 72px 0; }
  section + section { border-top: 1px solid var(--border); }
  .section-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 30px; }
  .section-kicker { margin: 0 0 8px; color: var(--accent); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
  h2.section-title { margin: 0; font-size: clamp(1.5rem, 2.7vw, 2.05rem); letter-spacing: -0.035em; line-height: 1.15; }
  .section-sub { margin: 8px 0 0; max-width: 620px; color: var(--muted); font-size: 0.9rem; }
  .section-note { color: var(--muted); font-family: var(--mono); font-size: 0.7rem; }

  .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(255px, 1fr)); gap: 14px; }
  .service-card {
    position: relative; padding: 19px; border: 1px solid var(--border); border-radius: 12px;
    background: linear-gradient(180deg, rgb(20 34 56 / 0.55), rgb(14 26 43 / 0.6));
    transition: border-color 180ms ease, transform 180ms ease, background 180ms ease;
  }
  .service-card:hover { border-color: var(--border-strong); transform: translateY(-2px); background: linear-gradient(180deg, rgb(23 39 62 / 0.7), rgb(14 26 43 / 0.72)); }
  .service-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .service-top h3 { margin: 0; font-size: 0.95rem; letter-spacing: -0.01em; }
  .service-role { margin: 4px 0 12px; color: var(--muted); font-size: 0.73rem; font-family: var(--mono); }
  .service-detail { margin: 0; color: var(--text-2); font-size: 0.82rem; }
  .service-meta { margin: 10px 0 0; padding-top: 10px; border-top: 1px dashed rgb(42 59 82 / 0.8); color: var(--muted); font-size: 0.68rem; font-family: var(--mono); }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; flex: none;
    padding: 4px 8px; border-radius: 999px; font-size: 0.62rem; font-weight: 700;
    letter-spacing: 0.03em; text-transform: uppercase; border: 1px solid var(--border);
    color: var(--text-2); background: rgb(42 59 82 / 0.35);
  }
  .chip .dot { width: 5px; height: 5px; box-shadow: none; animation: none; }
  .chip-operational { color: #6EE7B7; border-color: rgb(52 211 153 / 0.3); background: rgb(52 211 153 / 0.08); }
  .chip-degraded { color: #FCD34D; border-color: rgb(251 191 36 / 0.32); background: rgb(251 191 36 / 0.08); }
  .chip-offline { color: #FDA4AF; border-color: rgb(251 113 133 / 0.32); background: rgb(251 113 133 / 0.08); }
  .chip-idle { color: var(--accent); border-color: rgb(139 164 255 / 0.3); background: rgb(139 164 255 / 0.08); }
  .chip-unconfigured, .chip-unknown { color: var(--muted); }

  .data-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(158px, 1fr));
    gap: 1px; padding: 1px; background: var(--border); border-radius: 12px; overflow: hidden;
  }
  .data-grid .stat { background: var(--surface); padding: 18px; }
  .data-grid .stat-value { font-size: 1.6rem; }
  .data-foot { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 14px; color: var(--muted); font-size: 0.7rem; font-family: var(--mono); }
  .data-foot strong { color: var(--text-2); font-weight: 500; }

  /* ---------- architecture ---------- */
  .flow { display: flex; align-items: stretch; gap: 0; margin-top: 8px; }
  .flow-node {
    flex: 1; min-width: 0; padding: 17px; border: 1px solid var(--border); border-radius: 12px;
    background: var(--surface); position: relative;
  }
  .flow-node.target { border-color: rgb(59 104 252 / 0.55); background: linear-gradient(180deg, rgb(59 104 252 / 0.16), rgb(14 26 43 / 0.85)); }
  .flow-node.upstream { border-style: dashed; }
  .flow-label { color: var(--muted); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
  .flow-name { margin: 6px 0 5px; font-size: 0.88rem; font-weight: 700; }
  .flow-desc { color: var(--muted); font-size: 0.7rem; line-height: 1.5; }
  .flow-arrow { display: grid; place-items: center; padding: 0 8px; color: var(--border-strong); font-size: 1.05rem; flex: none; }
  .stack-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
  .stack-chip {
    padding: 6px 11px; border: 1px solid var(--border); border-radius: 999px;
    background: rgb(20 34 56 / 0.6); color: var(--text-2); font-size: 0.7rem; font-family: var(--mono);
  }

  /* ---------- developers ---------- */
  .dev-grid { display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr); gap: 22px; align-items: start; }
  .dev-grid > * { min-width: 0; }
  .panel { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); overflow: hidden; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 15px 18px; border-bottom: 1px solid var(--border); background: rgb(20 34 56 / 0.5); }
  .panel-head h3 { margin: 0; font-size: 0.82rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .panel-body { padding: 18px; }
  .base-url { display: flex; align-items: center; gap: 10px; }
  .base-url code {
    flex: 1; min-width: 0; padding: 11px 13px; border-radius: 9px; border: 1px solid var(--border);
    background: var(--elevated); font-family: var(--mono); font-size: 0.76rem;
    overflow-x: auto; white-space: nowrap; color: var(--accent);
  }
  .copy-btn {
    flex: none; padding: 9px 12px; border-radius: 9px; border: 1px solid var(--border-strong);
    background: var(--elevated); color: var(--text-2); font-family: var(--sans);
    font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: background 160ms ease, color 160ms ease;
  }
  .copy-btn:hover { background: #1B2B42; color: var(--text); }
  .link-list { list-style: none; margin: 18px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
  .link-list a { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 11px 4px; border-bottom: 1px dashed rgb(42 59 82 / 0.7); transition: color 160ms ease; }
  .link-list li:last-child a { border-bottom: 0; }
  .link-list a:hover { color: var(--accent); }
  .link-title { display: block; font-size: 0.86rem; font-weight: 600; }
  .link-desc { display: block; color: var(--muted); font-size: 0.71rem; }
  .link-arrow { color: var(--muted); font-size: 0.9rem; }
  .auth-note { color: var(--muted); font-size: 0.78rem; margin: 0; }
  .auth-note code { color: var(--text-2); font-family: var(--mono); font-size: 0.72rem; }
  .kv { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px dashed rgb(42 59 82 / 0.7); font-size: 0.78rem; }
  .kv:last-child { border-bottom: 0; }
  .kv span:first-child { color: var(--muted); }
  .kv span:last-child { font-family: var(--mono); font-size: 0.72rem; text-align: right; }

  .code-wrap { border: 1px solid var(--border); border-radius: 12px; background: #07101c; overflow: hidden; margin-bottom: 14px; min-width: 0; }
  .code-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 13px; border-bottom: 1px solid var(--border); background: var(--surface); color: var(--muted); font-size: 0.67rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
  .code-head .copy-btn { padding: 5px 9px; font-size: 0.64rem; }
  .code { margin: 0; padding: 16px; overflow-x: auto; font-family: var(--mono); font-size: 0.73rem; line-height: 1.72; color: #dbe6f5; }
  .code code { display: block; white-space: pre; }
  .code .cmt { color: #6b7f99; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
  .tag { padding: 4px 8px; border-radius: 6px; background: var(--elevated); border: 1px solid var(--border); color: var(--text-2); font-family: var(--mono); font-size: 0.65rem; }

  footer { border-top: 1px solid var(--border); padding: 30px 0 40px; color: var(--muted); font-size: 0.72rem; }
  .footer-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; }
  .footer-links { display: flex; flex-wrap: wrap; gap: 16px; }
  .footer-links a:hover { color: var(--accent); }
  .footer-meta code { font-family: var(--mono); color: var(--text-2); }

  @media (max-width: 960px) {
    .hero-inner { grid-template-columns: minmax(0, 1fr); padding-top: 56px; gap: 36px; }
    .hero-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .topnav { display: none; }
    .dev-grid { grid-template-columns: minmax(0, 1fr); }
    .flow { flex-direction: column; }
    .flow-arrow { transform: rotate(90deg); padding: 5px 0; }
  }
  @media (max-width: 600px) {
    .wrap { width: calc(100% - 28px); }
    .topbar-inner { height: 62px; gap: 12px; }
    .brand-divider, .brand-sub { display: none; }
    .pill { padding: 6px 9px; font-size: 0.68rem; }
    section { padding: 54px 0; }
    .hero-kpis { grid-template-columns: 1fr 1fr; }
    .stat-value { font-size: 1.25rem; }
    .status-detail { max-width: 48%; }
    .hero-actions .btn { flex: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    * { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="#top" aria-label="CriczApp API home">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.4" fill="currentColor"/>
          <path d="M8.4 4.9c2.9 3.7 2.9 10.5 0 14.2M15.6 4.9c-2.9 3.7-2.9 10.5 0 14.2" stroke="#08111F" stroke-width="1.35" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="brand-name">Cric<em>z</em>App</span>
      <span class="brand-divider" aria-hidden="true"></span>
      <span class="brand-sub">API Platform</span>
    </a>
    <nav class="topnav" aria-label="Sections">
      <a href="#services">Services</a>
      <a href="#data">Data</a>
      <a href="#architecture">Architecture</a>
      <a href="#developers">Developers</a>
    </nav>
    <span class="pill${ready ? '' : ' is-degraded'}" id="live-pill">
      <span class="dot dot-${ready ? 'operational' : 'degraded'}" aria-hidden="true"></span>
      <span id="live-pill-text">${ready ? 'All systems operational' : 'Degraded performance'}</span>
    </span>
  </div>
</header>

<main id="main">
  <div id="top"></div>
  <div class="hero">
    <div class="wrap hero-inner">
      <div>
        <p class="eyebrow">Production platform · ${esc(runtime.environment)}</p>
        <h1>Every ball,<br /><span class="accent">live from the backend.</span></h1>
        <p class="lede">
          The data engine behind CriczApp. Scores, timelines, PSL records and editorial flow
          through one API — backed by PostgreSQL, Redis and a realtime gateway. This page is the
          live pulse of that stack.
        </p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="${esc(data.docsUrl)}">
            Explore the API
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <a class="btn btn-ghost" href="${esc(data.openApiUrl)}">OpenAPI document</a>
          <a class="btn btn-ghost" href="${esc(data.healthUrl)}">Health JSON</a>
        </div>
        <div class="hero-kpis">${heroStats}</div>
      </div>

      <aside class="status-panel" aria-label="Live service status">
        <div class="status-head">
          <div>
            <h2>Live status</h2>
            <p>Probed on this request</p>
          </div>
          <span class="status-badge${ready ? '' : ' is-degraded'}">
            ${statusDot(ready ? 'operational' : 'degraded')}
            ${ready ? 'Operational' : 'Degraded'}
          </span>
        </div>
        ${statusRows}
        <div class="status-foot">
          <span>Checked in <code>${data.responseTimeMs} ms</code></span>
          <span><code id="last-checked">just now</code></span>
        </div>
      </aside>
    </div>
  </div>

  <section id="services">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="section-kicker">Services</p>
          <h2 class="section-title">The stack, as it stands right now.</h2>
          <p class="section-sub">Each card is backed by a real probe, a process signal or a stored heartbeat — no decorative green dots.</p>
        </div>
        <span class="section-note">${operationalCount} operational${
          attentionCount ? ` · ${attentionCount} needs attention` : ''
        }</span>
      </div>
      <div class="services-grid">${data.services.map(serviceCard).join('')}</div>
    </div>
  </section>

  <section id="data">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="section-kicker">Stored data</p>
          <h2 class="section-title">A working archive, not a demo seed.</h2>
          <p class="section-sub">Counts are read live from PostgreSQL through Prisma on every page request.</p>
        </div>
        <span class="section-note">Latest write ${esc(timeAgo(database.latestMatchAt))}</span>
      </div>
      <div class="data-grid">${dataStats}</div>
      <div class="data-foot">
        <span>DB latency <strong>${database.latencyMs} ms</strong></span>
        <span>Redis <strong>${redis.ok ? `${redis.latencyMs} ms` : 'unavailable'}</strong></span>
        <span>Live set <strong>${redis.liveSetSize}</strong></span>
        <span>Sync tracks <strong>${redis.syncKeyCount}</strong></span>
        <span>News synced <strong>${esc(timeAgo(redis.newsSyncedAt))}</strong></span>
        <span>Last snapshot <strong>${esc(fmtDate(data.generatedAt))}</strong></span>
      </div>
    </div>
  </section>

  <section id="architecture">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="section-kicker">Architecture</p>
          <h2 class="section-title">One pipeline from provider to pocket.</h2>
          <p class="section-sub">Ingestion is the only service that talks to the data provider. The API only reads the stored state, so a provider hiccup never takes the scoreboard down.</p>
        </div>
      </div>
      <div class="flow">
        <div class="flow-node upstream">
          <span class="flow-label">Upstream</span>
          <div class="flow-name">Cricket data feed</div>
          <div class="flow-desc">Fixtures, scores, timelines and news from the licensed provider.</div>
        </div>
        <div class="flow-arrow" aria-hidden="true">→</div>
        <div class="flow-node">
          <span class="flow-label">Worker</span>
          <div class="flow-name">Ingestion</div>
          <div class="flow-desc">Normalises payloads, diffs against stored state and writes only changes.</div>
        </div>
        <div class="flow-arrow" aria-hidden="true">→</div>
        <div class="flow-node">
          <span class="flow-label">State</span>
          <div class="flow-name">Postgres + Redis</div>
          <div class="flow-desc">Durable history in Postgres; cache, live set and pub/sub in Redis.</div>
        </div>
        <div class="flow-arrow" aria-hidden="true">→</div>
        <div class="flow-node target">
          <span class="flow-label">Serving</span>
          <div class="flow-name">NestJS API</div>
          <div class="flow-desc">REST, JWT sessions, rate limits, Socket.IO and OpenAPI docs.</div>
        </div>
        <div class="flow-arrow" aria-hidden="true">→</div>
        <div class="flow-node">
          <span class="flow-label">Clients</span>
          <div class="flow-name">Web &amp; apps</div>
          <div class="flow-desc">CriczApp pages consume the same public contracts as any integrator.</div>
        </div>
      </div>
      <div class="stack-row">${stack}</div>
    </div>
  </section>

  <section id="developers">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="section-kicker">Developer portal</p>
          <h2 class="section-title">Build on the same API we ship with.</h2>
          <p class="section-sub">Public reads need no key. Signed-in actions use the sitting user's HttpOnly session cookie. Start with the Swagger UI or pull the OpenAPI document into your toolchain.</p>
        </div>
        <a class="btn btn-ghost" href="${esc(data.docsUrl)}">Open Swagger UI →</a>
      </div>

      <div class="dev-grid">
        <div class="panel">
          <div class="panel-head"><h3>Base URL &amp; docs</h3><span class="section-note">v1</span></div>
          <div class="panel-body">
            <div class="base-url">
              <code>${esc(baseUrl)}</code>
              <button class="copy-btn" type="button" data-copy="${esc(baseUrl)}">Copy</button>
            </div>
            <ul class="link-list">
              <li>
                <a href="${esc(data.docsUrl)}">
                  <span><span class="link-title">Swagger UI</span><span class="link-desc">Try every endpoint in the browser</span></span>
                  <span class="link-arrow" aria-hidden="true">↗</span>
                </a>
              </li>
              <li>
                <a href="${esc(data.openApiUrl)}">
                  <span><span class="link-title">OpenAPI 3 document</span><span class="link-desc">${esc(operations)} operations · ${esc(paths)} paths</span></span>
                  <span class="link-arrow" aria-hidden="true">↗</span>
                </a>
              </li>
              <li>
                <a href="${esc(data.healthUrl)}">
                  <span><span class="link-title">Health JSON</span><span class="link-desc">Machine-readable status for uptime checks</span></span>
                  <span class="link-arrow" aria-hidden="true">↗</span>
                </a>
              </li>
              <li>
                <a href="${esc(data.webUrl)}">
                  <span><span class="link-title">CriczApp product</span><span class="link-desc">See the API in production</span></span>
                  <span class="link-arrow" aria-hidden="true">↗</span>
                </a>
              </li>
            </ul>
            <div class="panel-head" style="margin:20px -18px 0; border-top:1px solid var(--border);"><h3>Session contract</h3></div>
            <div style="padding-top:14px">
              <p class="auth-note">
                <code>POST /api/auth/login</code> sets an HttpOnly cookie named
                <code>cricapp_access_token</code>. Send <code>credentials: 'include'</code>
                from browsers. Admin routes additionally require an admin role.
              </p>
              <div class="kv"><span>Public reads</span><span>no key</span></div>
              <div class="kv"><span>Rate limit</span><span>${esc(data.config.rateLimit)}</span></div>
              <div class="kv"><span>Realtime</span><span>${esc(data.config.realtime)}</span></div>
              <div class="kv"><span>Email / media / push</span><span>${esc(data.config.email)} · ${esc(data.config.media)} · ${esc(data.config.push)}</span></div>
            </div>
          </div>
        </div>

        <div>
          ${codeBlock(curlSnippet, 'Terminal')}
          ${codeBlock(fetchSnippet, 'JavaScript')}
          <div class="panel">
            <div class="panel-head"><h3>API surface</h3><span class="section-note">${esc(operations)} ops</span></div>
            <div class="panel-body">
              <p class="auth-note">Modules documented in this deployment's OpenAPI schema.</p>
              <div class="tags">${tagChips}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap footer-inner">
    <div>
      CriczApp Platform · API v1 · ${esc(runtime.environment)} · ${esc(runtime.region)}
      ${runtime.commit ? ` · <code>${esc(runtime.commit)}</code>${runtime.branch ? ` (${esc(runtime.branch)})` : ''}` : ''}
    </div>
    <div class="footer-meta">
      Rendered in <code>${data.responseTimeMs} ms</code> · ${esc(fmtDate(data.generatedAt))}
    </div>
    <div class="footer-links">
      <a href="${esc(data.docsUrl)}">Docs</a>
      <a href="${esc(data.healthUrl)}">Health</a>
      <a href="#top">Back to top</a>
    </div>
  </div>
</footer>

<script>
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Count-up for real stored numbers.
  if (!reduceMotion) {
    document.querySelectorAll('.js-count').forEach(function (el) {
      var target = Number(el.getAttribute('data-value'));
      if (!isFinite(target) || target <= 0) return;
      var start = performance.now();
      var duration = 850;
      function frame(now) {
        var progress = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased).toLocaleString('en-US');
        if (progress < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  // Copy buttons: inline value or the <code> block that follows.
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var inline = btn.getAttribute('data-copy');
      var text = inline;
      if (inline === null) {
        var holder = btn.closest('.code-wrap');
        var code = holder ? holder.querySelector('code') : null;
        text = code ? code.innerText : '';
      }
      var done = function () {
        var original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = original; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {});
      }
    });
  });

  // Lightweight health poll keeps the header pill honest without a reload.
  var pill = document.getElementById('live-pill');
  var pillText = document.getElementById('live-pill-text');
  var lastChecked = document.getElementById('last-checked');
  function check() {
    fetch('/api/health/json', { headers: { accept: 'application/json' }, cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (body) {
        var healthy = body && body.status === 'healthy';
        if (pill) {
          pill.className = 'pill' + (healthy ? '' : ' is-degraded');
          var dot = pill.querySelector('.dot');
          if (dot) dot.className = 'dot ' + (healthy ? 'dot-operational' : 'dot-degraded');
        }
        if (pillText) pillText.textContent = healthy ? 'All systems operational' : 'Degraded performance';
        if (lastChecked) lastChecked.textContent = new Date().toLocaleTimeString();
      })
      .catch(function () {
        if (pill) pill.className = 'pill is-down';
        if (pillText) pillText.textContent = 'Status check failed';
      });
  }
  setInterval(check, 30000);
})();
</script>
</body>
</html>`;
}
