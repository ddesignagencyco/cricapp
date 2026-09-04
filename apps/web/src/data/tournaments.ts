import { Tournament } from '../types/index';

export const tournaments: Tournament[] = [
  {
    id: 't1',
    name: 'Pakistan Super League',
    code: 'PSL',
    shortName: 'PSL 2026',
    year: 2026,
    format: 'T20',
    status: 'ongoing',
    season: 11,
    teams: [
      'lahore-qalandars',
      'karachi-kings',
      'islamabad-united',
      'peshawar-zalmi',
      'multan-sultans',
      'quetta-gladiators',
    ],
    totalMatches: 34,
    matchesPlayed: 24,
    description:
      'The Pakistan Super League (PSL) is a professional franchise Twenty20 cricket league in Pakistan. Established in 2016, it features six franchise teams representing major Pakistani cities.',
  },
  {
    id: 't2',
    name: 'International T20',
    code: 'T20I',
    shortName: 'International T20',
    year: 2026,
    format: 'T20',
    status: 'ongoing',
    season: 1,
    teams: ['england', 'australia', 'india', 'new-zealand', 'south-africa', 'pakistan'],
    totalMatches: 12,
    matchesPlayed: 4,
    description:
      'International Twenty20 cricket featuring the world\'s top national teams in bilateral and tri-nation series.',
  },
  {
    id: 't3',
    name: 'ODI World Cup Qualifiers',
    code: 'ODI',
    shortName: 'ODI Qualifiers',
    year: 2027,
    format: 'ODI',
    status: 'upcoming',
    season: 1,
    teams: ['england', 'australia', 'india', 'new-zealand', 'south-africa', 'pakistan'],
    totalMatches: 24,
    matchesPlayed: 0,
    description:
      'The qualifying tournament for the ODI World Cup, featuring associate and full member nations battling for a place in the premier one-day international competition.',
  },
];

export default tournaments;
