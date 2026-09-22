type Gender = 'male' | 'female' | null;
type AgeGroup = 'senior' | 'u19' | 'u23' | 'masters' | null;

function readString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function genderFromText(text: string): Gender {
  const t = text.toLowerCase();
  if (/\bwomen\b|\bfemale\b|\bw\b(?=.*international)/.test(t)) return 'female';
  if (/\bmen\b|\bmale\b/.test(t)) return 'male';
  return null;
}

function ageGroupFromText(text: string): AgeGroup {
  const t = text.toLowerCase();
  if (/\bu19\b|\bunder-19\b|\bunder 19\b/.test(t)) return 'u19';
  if (/\bu23\b|\bunder-23\b/.test(t)) return 'u23';
  if (/\bmasters\b/.test(t)) return 'masters';
  return 'senior';
}

export function teamKindFromProfile(
  teamInfo: unknown,
  tournamentHint?: string | null,
): {
  gender: Gender;
  ageGroup: AgeGroup;
  category: string | null;
  kindLabel: string | null;
} {
  const info =
    teamInfo && typeof teamInfo === 'object'
      ? ((teamInfo as Record<string, unknown>).team as Record<string, unknown> | undefined) ??
        (teamInfo as Record<string, unknown>)
      : {};
  const category =
    readString(info, 'category') ??
    (typeof info.category === 'object' && info.category
      ? readString(info.category as Record<string, unknown>, 'name')
      : null);

  const corpus = [
    readString(info, 'name'),
    readString(info, 'gender'),
    readString(info, 'type'),
    category,
    tournamentHint,
  ]
    .filter(Boolean)
    .join(' ');

  const gender = genderFromText(corpus);
  const ageGroup = ageGroupFromText(corpus);
  const parts = [
    ageGroup === 'u19' ? 'U19' : ageGroup === 'u23' ? 'U23' : ageGroup === 'masters' ? 'Masters' : null,
    gender === 'female' ? 'Women' : gender === 'male' ? 'Men' : null,
    category && category !== 'International' ? category : category === 'International' ? 'International' : null,
  ].filter(Boolean);
  const kindLabel = parts.length ? parts.join(' · ') : null;

  return { gender, ageGroup, category, kindLabel };
}
