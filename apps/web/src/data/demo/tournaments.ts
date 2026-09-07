export const demoTours = [
  { id: 'tour:psl', name: 'Pakistan Super League', category: { id: 'sr:category:1149', name: 'Pakistan', country_code: 'PAK' }, sport: { id: 'sr:sport:21', name: 'Cricket' } },
  { id: 'tour:i20', name: 'International T20', category: { id: 'sr:category:105', name: 'International' }, sport: { id: 'sr:sport:21', name: 'Cricket' } },
  { id: 'tour:odi', name: 'International ODI', category: { id: 'sr:category:105', name: 'International' }, sport: { id: 'sr:sport:21', name: 'Cricket' } },
  { id: 'tour:australia', name: 'Australia Cricket', category: { id: 'sr:category:491', name: 'Australia', country_code: 'AUS' }, sport: { id: 'sr:sport:21', name: 'Cricket' } },
  { id: 'tour:england', name: 'England Cricket', category: { id: 'sr:category:498', name: 'England', country_code: 'ENG' }, sport: { id: 'sr:sport:21', name: 'Cricket' } },
  { id: 'tour:india', name: 'India Cricket', category: { id: 'sr:category:394', name: 'India', country_code: 'IND' }, sport: { id: 'sr:sport:21', name: 'Cricket' } },
  { id: 'tour:roe', name: 'Rest of World', category: { id: 'sr:category:105', name: 'International' }, sport: { id: 'sr:sport:21', name: 'Cricket' } },
] as any[];

export const demoTournaments = [
  {
    id: 'sr:tournament:demo:psl',
    name: 'Pakistan Super League',
    type: 't20',
    gender: 'men',
    category: { id: 'sr:category:1149', name: 'Pakistan', country_code: 'PAK' },
    currentSeason: {
      id: 'sr:season:demo:psl',
      name: 'Pakistan Super League 2026',
      year: '2026',
      start_date: '2026-02-12',
      end_date: '2026-03-26',
    },
    sport: { id: 'sr:sport:21', name: 'Cricket' },
    tourId: null,
    parentId: null,
  },
  {
    id: 'sr:tournament:demo:worldcup',
    name: 'ICC Men\'s T20 World Cup',
    type: 't20',
    gender: 'men',
    category: { id: 'sr:category:105', name: 'International' },
    currentSeason: {
      id: 'sr:season:demo:worldcup',
      name: 'ICC Men\'s T20 World Cup 2026',
      year: '2026',
      start_date: '2026-03-09',
      end_date: '2026-04-13',
    },
    sport: { id: 'sr:sport:21', name: 'Cricket' },
    tourId: null,
    parentId: null,
  },
  {
    id: 'sr:tournament:demo:ash',
    name: 'The Ashes',
    type: 'test',
    gender: 'men',
    category: { id: 'sr:category:498', name: 'England', country_code: 'ENG' },
    currentSeason: {
      id: 'sr:season:demo:ash',
      name: 'The Ashes 2025/26',
      year: '2026',
      start_date: '2026-07-20',
      end_date: '2026-08-25',
    },
    sport: { id: 'sr:sport:21', name: 'Cricket' },
    tourId: null,
    parentId: null,
  },
  {
    id: 'sr:tournament:demo:ipl',
    name: 'Indian Premier League',
    type: 't20',
    gender: 'men',
    category: { id: 'sr:category:394', name: 'India', country_code: 'IND' },
    currentSeason: {
      id: 'sr:season:demo:ipl',
      name: 'Indian Premier League 2026',
      year: '2026',
      start_date: '2026-04-05',
      end_date: '2026-06-02',
    },
    sport: { id: 'sr:sport:21', name: 'Cricket' },
    tourId: null,
    parentId: null,
  },
  {
    id: 'sr:tournament:demo:wcq',
    name: 'ODI World Cup Qualifiers',
    type: 'odi',
    gender: 'men',
    category: { id: 'sr:category:105', name: 'International' },
    currentSeason: {
      id: 'sr:season:demo:wcq',
      name: 'ODI World Cup Qualifiers 2027',
      year: '2027',
      start_date: '2027-06-15',
      end_date: '2027-07-10',
    },
    sport: { id: 'sr:sport:21', name: 'Cricket' },
    tourId: null,
    parentId: null,
  },
  {
    id: 'sr:tournament:demo:llg',
    name: 'Big Bash League',
    type: 't20',
    gender: 'men',
    category: { id: 'sr:category:491', name: 'Australia', country_code: 'AUS' },
    currentSeason: {
      id: 'sr:season:demo:llg',
      name: 'Big Bash League 2026/27',
      year: '2027',
      start_date: '2026-12-18',
      end_date: '2027-02-10',
    },
    sport: { id: 'sr:sport:21', name: 'Cricket' },
    tourId: null,
    parentId: null,
  },
  {
    id: 'sr:tournament:demo:il20',
    name: 'International T20 Tri-Series',
    type: 't20',
    gender: 'men',
    category: { id: 'sr:category:105', name: 'International' },
    currentSeason: {
      id: 'sr:season:demo:il20',
      name: 'Tri-Series 2026',
      year: '2026',
      start_date: '2026-09-15',
      end_date: '2026-09-30',
    },
    sport: { id: 'sr:sport:21', name: 'Cricket' },
    tourId: null,
    parentId: null,
  },
] as any[];

export const demoSeasons: Record<string, any[]> = {
  'sr:tournament:demo:psl': [
    { id: 'sr:season:demo:psl', tournamentId: 'sr:tournament:demo:psl', name: 'Pakistan Super League 2026', year: '2026', startDate: '2026-02-12', endDate: '2026-03-26' },
    { id: 'sr:season:demo:psl2', tournamentId: 'sr:tournament:demo:psl', name: 'Pakistan Super League 2025', year: '2025', startDate: '2025-02-10', endDate: '2025-03-25' },
    { id: 'sr:season:demo:psl3', tournamentId: 'sr:tournament:demo:psl', name: 'Pakistan Super League 2024', year: '2024', startDate: '2024-02-15', endDate: '2024-03-20' },
  ],
  'sr:tournament:demo:worldcup': [
    { id: 'sr:season:demo:worldcup', tournamentId: 'sr:tournament:demo:worldcup', name: 'ICC Men\'s T20 World Cup 2026', year: '2026', startDate: '2026-03-09', endDate: '2026-04-13' },
    { id: 'sr:season:demo:worldcup2', tournamentId: 'sr:tournament:demo:worldcup', name: 'ICC Men\'s T20 World Cup 2025', year: '2025', startDate: '2025-05-15', endDate: '2025-06-12' },
  ],
  'sr:tournament:demo:ash': [
    { id: 'sr:season:demo:ash', tournamentId: 'sr:tournament:demo:ash', name: 'The Ashes 2025/26', year: '2026', startDate: '2026-07-20', endDate: '2026-08-25' },
    { id: 'sr:season:demo:ash2', tournamentId: 'sr:tournament:demo:ash', name: 'The Ashes 2023', year: '2023', startDate: '2023-06-16', endDate: '2023-07-31' },
  ],
};

export const demoResults: Record<string, any[]> = {
  'sr:tournament:demo:psl': [
    {
      kind: 'tournament_results',
      scopeKey: 'sr:season:demo:psl',
      eventId: 'sr:match:demo:completed002',
      status: 'closed',
      scheduled: '2026-03-24T14:00:00+00:00',
      payload: {
        sport_event: {
          id: 'sr:match:demo:completed002',
          scheduled: '2026-03-24T14:00:00+00:00',
          tournament: { id: 'sr:tournament:demo:psl', name: 'Pakistan Super League' },
          venue: { name: 'Gaddafi Stadium, Lahore' },
          competitors: [
            { id: 'sr:competitor:243432', name: 'Peshawar Zalmi', abbreviation: 'PZA', qualifier: 'home' },
            { id: 'sr:competitor:243436', name: 'Lahore Qalandars', abbreviation: 'LQA', qualifier: 'away' },
          ],
        },
        sport_event_status: {
          status: 'closed',
          match_status: 'ended',
          display_score: '178/6',
          match_result_text: 'Lahore Qalandars won by 4 wickets',
          winner_id: 'sr:competitor:243436',
        },
      },
    },
    {
      kind: 'tournament_results',
      scopeKey: 'sr:season:demo:psl',
      eventId: 'sr:match:demo:completed004',
      status: 'closed',
      scheduled: '2026-03-22T14:00:00+00:00',
      payload: {
        sport_event: {
          id: 'sr:match:demo:completed004',
          scheduled: '2026-03-22T14:00:00+00:00',
          tournament: { id: 'sr:tournament:demo:psl', name: 'Pakistan Super League' },
          venue: { name: 'Rawalpindi Cricket Stadium' },
          competitors: [
            { id: 'sr:competitor:243430', name: 'Islamabad United', abbreviation: 'ISL', qualifier: 'home' },
            { id: 'sr:competitor:243436', name: 'Lahore Qalandars', abbreviation: 'LQA', qualifier: 'away' },
          ],
        },
        sport_event_status: {
          status: 'closed',
          match_status: 'ended',
          display_score: '156/7',
          match_result_text: 'Islamabad United won by 3 runs',
          winner_id: 'sr:competitor:243430',
        },
      },
    },
    {
      kind: 'tournament_results',
      scopeKey: 'sr:season:demo:psl',
      eventId: 'sr:match:demo:completed005',
      status: 'closed',
      scheduled: '2026-03-20T14:00:00+00:00',
      payload: {
        sport_event: {
          id: 'sr:match:demo:completed005',
          scheduled: '2026-03-20T14:00:00+00:00',
          tournament: { id: 'sr:tournament:demo:psl', name: 'Pakistan Super League' },
          venue: { name: 'National Bank Stadium, Karachi' },
          competitors: [
            { id: 'sr:competitor:243437', name: 'Karachi Kings', abbreviation: 'KAR', qualifier: 'home' },
            { id: 'sr:competitor:243440', name: 'Multan Sultans', abbreviation: 'MUL', qualifier: 'away' },
          ],
        },
        sport_event_status: {
          status: 'closed',
          match_status: 'ended',
          display_score: '201/5',
          match_result_text: 'Multan Sultans won by 5 wickets',
          winner_id: 'sr:competitor:243440',
        },
      },
    },
  ],
  'sr:tournament:demo:worldcup': [
    {
      kind: 'tournament_results',
      scopeKey: 'sr:season:demo:worldcup',
      eventId: 'sr:match:demo:completed006',
      status: 'closed',
      scheduled: '2026-04-12T13:00:00+00:00',
      payload: {
        sport_event: {
          id: 'sr:match:demo:completed006',
          scheduled: '2026-04-12T13:00:00+00:00',
          tournament: { id: 'sr:tournament:demo:worldcup', name: 'ICC Men\'s T20 World Cup' },
          venue: { name: 'Eden Gardens, Kolkata' },
          competitors: [
            { id: 'sr:competitor:390', name: 'India', abbreviation: 'IND', qualifier: 'home' },
            { id: 'sr:competitor:830', name: 'Australia', abbreviation: 'AUS', qualifier: 'away' },
          ],
        },
        sport_event_status: {
          status: 'closed',
          match_status: 'ended',
          display_score: '172/4',
          match_result_text: 'India won by 6 wickets',
          winner_id: 'sr:competitor:390',
        },
      },
    },
  ],
};

export const demoMatchById: Record<string, any> = {
  'sr:match:demo:completed002': demoMatchesLike1(),
  'sr:match:demo:live001': demoMatchesLike1(),
};

function demoMatchesLike1() {
  return {
    matchId: 'sr:match:demo:completed002',
    status: 'completed',
    teams: ['PZA', 'LQA'],
    teamNames: ['Peshawar Zalmi', 'Lahore Qalandars'],
    tournament: 'Pakistan Super League',
    venue: 'Gaddafi Stadium, Lahore',
    scheduled: '2026-03-24T14:00:00+00:00',
    displayScore: '178/6',
    matchStatus: 'ended',
    currentInnings: null,
    lastEvent: { type: 'none', runs: 0, over: 0 },
  };
}