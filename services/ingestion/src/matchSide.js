/** Match a batting-team token (abbr, id, or name) to home/away competitors. */
export function battingSideFromToken(battingToken, homeComp, awayComp) {
  if (!battingToken) return null;
  const matches = (comp) => {
    if (!comp) return false;
    const b = String(battingToken).toLowerCase().trim();
    if (comp.id && b === String(comp.id).toLowerCase()) return true;
    const abbr = (comp.abbreviation ?? '').toLowerCase();
    const name = (comp.name ?? '').toLowerCase();
    if (abbr && (b === abbr || b.includes(abbr) || abbr.includes(b))) return true;
    if (name && (b === name || b.includes(name) || name.includes(b))) return true;
    return false;
  };
  if (matches(awayComp)) return 'away';
  if (matches(homeComp)) return 'home';
  return null;
}
