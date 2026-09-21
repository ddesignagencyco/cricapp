import { countryNameFromCode } from './teamMeta.js';

const ROLE_MAP = {
  batsman: 'batsman',
  bowler: 'bowler',
  all_rounder: 'all_rounder',
  wicketkeeper: 'wicketkeeper',
  wicket_keeper: 'wicketkeeper',
};

function normalizeJersey(n) {
  if (n === null || n === undefined || n === '') return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

export function parseFullName(name) {
  const trimmed = (name || '').trim();
  const idx = trimmed.indexOf(',');
  if (idx === -1) return { fullName: trimmed, last: trimmed };
  const last = trimmed.slice(0, idx).trim();
  const rest = trimmed.slice(idx + 1).trim();
  return { fullName: `${rest} ${last}`.trim(), last };
}

export function roleFromSportradarType(p) {
  if (p?.type && ROLE_MAP[p.type]) return ROLE_MAP[p.type];
  if (p?.is_wicketkeeper) return 'wicketkeeper';
  if (p?.type) return String(p.type).replace(/-/g, '_');
  return 'player';
}

function resolveProfileUrlFromPayload(p) {
  if (!p || typeof p !== 'object') return null;
  if (typeof p.avatar_url === 'string') return p.avatar_url;
  if (typeof p.headshot_url === 'string') return p.headshot_url;
  const images = p.images;
  if (Array.isArray(images)) {
    const head = images.find((i) => /headshot|photo|profile/i.test(i?.type ?? i?.rel ?? ''));
    if (head?.href) return head.href;
    if (head?.url) return head.url;
  }
  return null;
}

function pickActiveRole(payload, preferredTeamId) {
  const roles = payload?.roles ?? [];
  if (!roles.length) return null;
  const active = roles.filter((r) => r.active !== false);
  if (preferredTeamId) {
    return active.find((r) => r.team?.id === preferredTeamId) ?? roles.find((r) => r.team?.id === preferredTeamId);
  }
  return active[0] ?? roles[0];
}

export function buildPlayerFromLineupEntry(p, teamId) {
  if (!p?.id) return null;
  const parsed = parseFullName(p.name);
  return {
    id: p.id,
    fullName: parsed.fullName,
    shortName: p.name ?? null,
    teamId: teamId ?? null,
    birth: p.date_of_birth ?? null,
    nationality: p.nationality ?? countryNameFromCode(p.country_code) ?? null,
    countryCode: p.country_code ?? null,
    battingStyle: p.batting_style ?? null,
    bowlingStyle: p.bowling_style ?? null,
    jerseyNumber: p.jersey_number ?? null,
    height: p.height ?? null,
    role: roleFromSportradarType(p),
    profileUrl: resolveProfileUrlFromPayload(p),
  };
}

export function buildPlayerFromSquadEntry(p, teamId) {
  if (!p?.playerId && !p?.id) return null;
  return {
    id: p.playerId ?? p.id,
    fullName: p.playerName ?? p.full_name ?? p.name ?? 'Unknown',
    shortName: p.playerShortName ?? p.name ?? null,
    teamId: teamId ?? null,
    birth: p.dateOfBirth ?? p.date_of_birth ?? null,
    nationality: p.nationality ?? null,
    countryCode: p.countryCode ?? p.country_code ?? null,
    battingStyle: p.battingStyle ?? p.batting_style ?? null,
    bowlingStyle: p.bowlingStyle ?? p.bowling_style ?? null,
    jerseyNumber: p.jerseyNumber ?? p.jersey_number ?? null,
    height: p.height ?? null,
    role: roleFromSportradarType(p),
    profileUrl: p.profileUrl ?? p.profile_url ?? resolveProfileUrlFromPayload(p),
  };
}

export function buildPlayerFromProfile(payload, preferredTeamId) {
  const p = payload?.player ?? payload ?? {};
  if (!p.id) return null;
  const parsed = parseFullName(p.name ?? p.full_name);
  const roleInfo = pickActiveRole(payload, preferredTeamId);
  return {
    id: p.id,
    fullName: p.full_name ?? parsed.fullName,
    shortName: p.name ?? null,
    teamId: preferredTeamId ?? roleInfo?.team?.id ?? null,
    birth: p.date_of_birth ?? null,
    nationality: p.nationality ?? countryNameFromCode(p.country_code) ?? null,
    countryCode: p.country_code ?? null,
    battingStyle: p.batting_style ?? null,
    bowlingStyle: p.bowling_style ?? null,
    jerseyNumber: normalizeJersey(roleInfo?.jersey_number ?? p.jersey_number),
    height: p.height ?? null,
    role: roleFromSportradarType(p),
    profileUrl: resolveProfileUrlFromPayload(p),
  };
}
