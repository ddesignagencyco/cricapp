/** ISO-style codes Sportradar uses on cricket competitors (incl. common aliases). */
const CODE_TO_COUNTRY = Object.freeze({
  IND: 'India',
  PAK: 'Pakistan',
  AUS: 'Australia',
  ENG: 'England',
  GBR: 'England',
  ZWE: 'Zimbabwe',
  ZIM: 'Zimbabwe',
  IRL: 'Ireland',
  NZL: 'New Zealand',
  RSA: 'South Africa',
  SA: 'South Africa',
  BAN: 'Bangladesh',
  BGD: 'Bangladesh',
  AFG: 'Afghanistan',
  LKA: 'Sri Lanka',
  SL: 'Sri Lanka',
  WI: 'West Indies',
  NED: 'Netherlands',
  NLD: 'Netherlands',
  USA: 'United States',
  CAN: 'Canada',
  UAE: 'United Arab Emirates',
  ARE: 'United Arab Emirates',
  HUN: 'Hungary',
  ANT: 'Antigua and Barbuda',
  ATG: 'Antigua and Barbuda',
});

export function countryNameFromCode(code) {
  if (!code || typeof code !== 'string') return null;
  const key = code.trim().toUpperCase();
  return CODE_TO_COUNTRY[key] ?? null;
}

function sportEventRoot(sportEvent) {
  if (!sportEvent || typeof sportEvent !== 'object') return {};
  return sportEvent.sport_event ?? sportEvent;
}

/**
 * Resolve display country from competitor + optional sport_event context.
 */
function categoryAsCountry(category) {
  if (!category?.name || category.name === 'International') return null;
  return category.name;
}

export function resolveTeamCountry(comp, sportEvent) {
  if (!comp) return null;
  if (comp.country) return comp.country;
  const fromCode = countryNameFromCode(comp.country_code);
  if (fromCode) return fromCode;
  if (comp.country_code) return comp.country_code;

  const fromTeamCategory = categoryAsCountry(comp.category);
  if (fromTeamCategory) return fromTeamCategory;
  if (comp.category?.name === 'International' && comp.name) {
    return comp.name;
  }

  const event = sportEventRoot(sportEvent);
  const cat = event.tournament?.category ?? event.season?.category;
  if (cat?.country_code && cat.name && cat.name !== 'International') {
    return cat.name;
  }
  if (cat?.country_code) {
    return countryNameFromCode(cat.country_code) ?? cat.country_code;
  }
  return categoryAsCountry(cat);
}

/**
 * Logo URLs are rare in cricket-t2 JSON; pick any provider field if present.
 */
export function resolveTeamLogo(entity) {
  if (!entity || typeof entity !== 'object') return null;
  if (typeof entity.logo === 'string') return entity.logo;
  if (typeof entity.logo_url === 'string') return entity.logo_url;
  if (typeof entity.logoUrl === 'string') return entity.logoUrl;
  const images = entity.images;
  if (Array.isArray(images)) {
    const logo = images.find((i) => /logo/i.test(i?.type ?? i?.rel ?? ''));
    if (logo?.href) return logo.href;
    if (logo?.url) return logo.url;
  }
  return null;
}

export function managerDisplayName(manager) {
  if (!manager) return null;
  if (typeof manager === 'string') return manager;
  return manager.name ?? manager.full_name ?? null;
}

export function buildTeamFromCompetitor(comp, sportEvent) {
  return {
    id: comp.id,
    name: comp.name ?? comp.abbreviation ?? 'Unknown',
    abbr: comp.abbreviation ?? null,
    country: resolveTeamCountry(comp, sportEvent),
    logoUrl: resolveTeamLogo(comp),
    manager: null,
  };
}

export function buildTeamFromProfile({ teamId, manager, teamInfo }) {
  const raw = teamInfo ?? {};
  const team = raw.team ?? raw;
  return {
    id: teamId ?? team.id,
    name: team.name ?? 'Unknown',
    abbr: team.abbreviation ?? null,
    country:
      team.country ??
      countryNameFromCode(team.country_code) ??
      categoryAsCountry(team.category) ??
      (team.category?.name === 'International' ? team.name ?? null : null),
    logoUrl: resolveTeamLogo(team) ?? resolveTeamLogo(raw),
    manager: managerDisplayName(manager),
  };
}

export function buildTeamFromTournamentTeam(team) {
  return {
    id: team.id,
    name: team.name ?? 'Unknown',
    abbr: team.abbreviation ?? null,
    country: resolveTeamCountry(team, {}),
    logoUrl: resolveTeamLogo(team),
    manager: null,
  };
}
