export const demoPslSeasons = [
  { id: 'sr:season:demo:psl', name: 'Pakistan Super League 2026', year: '2026' },
  { id: 'sr:season:129023', name: 'Pakistan Super League 2025', year: '2025' },
  { id: 'sr:season:114833', name: 'Pakistan Super League 2024', year: '2024' },
];

export const demoPslStandings = [
  { seasonId: 'sr:season:demo:psl', teamId: 'sr:competitor:243432', teamName: 'Peshawar Zalmi', teamAbbr: 'PZA', rank: 1, played: 10, won: 8, lost: 1, tied: 0, noResult: 1, points: 17, netRunRate: 1.32, runsFor: 1680, runsAgainst: 1544, oversFor: 190.4, oversAgainst: 190.0, change: 0 },
  { seasonId: 'sr:season:demo:psl', teamId: 'sr:competitor:243436', teamName: 'Lahore Qalandars', teamAbbr: 'LQA', rank: 2, played: 10, won: 7, lost: 2, tied: 0, noResult: 1, points: 15, netRunRate: 0.98, runsFor: 1732, runsAgainst: 1638, oversFor: 191.2, oversAgainst: 192.3, change: 1 },
  { seasonId: 'sr:season:demo:psl', teamId: 'sr:competitor:243430', teamName: 'Islamabad United', teamAbbr: 'ISL', rank: 3, played: 10, won: 6, lost: 4, tied: 0, noResult: 0, points: 12, netRunRate: 0.55, runsFor: 1701, runsAgainst: 1663, oversFor: 189.5, oversAgainst: 190.2, change: -1 },
  { seasonId: 'sr:season:demo:psl', teamId: 'sr:competitor:243440', teamName: 'Multan Sultans', teamAbbr: 'MUL', rank: 4, played: 10, won: 5, lost: 5, tied: 0, noResult: 0, points: 10, netRunRate: -0.11, runsFor: 1688, runsAgainst: 1694, oversFor: 191.0, oversAgainst: 190.1, change: 2 },
  { seasonId: 'sr:season:demo:psl', teamId: 'sr:competitor:243437', teamName: 'Karachi Kings', teamAbbr: 'KAR', rank: 5, played: 10, won: 4, lost: 6, tied: 0, noResult: 0, points: 8, netRunRate: -0.42, runsFor: 1622, runsAgainst: 1668, oversFor: 190.4, oversAgainst: 189.2, change: -1 },
  { seasonId: 'sr:season:demo:psl', teamId: 'sr:competitor:243442', teamName: 'Quetta Gladiators', teamAbbr: 'QUE', rank: 6, played: 10, won: 2, lost: 8, tied: 0, noResult: 0, points: 4, netRunRate: -1.18, runsFor: 1555, runsAgainst: 1679, oversFor: 191.0, oversAgainst: 188.4, change: -1 },
];

export const demoPslSchedule = [
  { matchId: 'sr:match:demo:psls1', seasonId: 'sr:season:demo:psl', status: 'closed', scheduled: '2026-03-26T14:00:00+00:00', homeTeamId: 'sr:competitor:243436', homeTeamName: 'Lahore Qalandars', homeTeamAbbr: 'LQA', awayTeamId: 'sr:competitor:243432', awayTeamName: 'Peshawar Zalmi', awayTeamAbbr: 'PZA', venue: 'Gaddafi Stadium, Lahore', round: 'Final', resultText: 'Lahore Qalandars won by 4 wickets' },
  { matchId: 'sr:match:demo:psls2', seasonId: 'sr:season:demo:psl', status: 'closed', scheduled: '2026-03-24T14:00:00+00:00', homeTeamId: 'sr:competitor:243432', homeTeamName: 'Peshawar Zalmi', homeTeamAbbr: 'PZA', awayTeamId: 'sr:competitor:243430', awayTeamName: 'Islamabad United', awayTeamAbbr: 'ISL', venue: 'Rawalpindi Cricket Stadium', round: 'Qualifier', resultText: 'Peshawar Zalmi won by 15 runs' },
  { matchId: 'sr:match:demo:psls3', seasonId: 'sr:season:demo:psl', status: 'closed', scheduled: '2026-03-22T14:00:00+00:00', homeTeamId: 'sr:competitor:243430', homeTeamName: 'Islamabad United', homeTeamAbbr: 'ISL', awayTeamId: 'sr:competitor:243436', awayTeamName: 'Lahore Qalandars', awayTeamAbbr: 'LQA', venue: 'Rawalpindi Cricket Stadium', round: 'Eliminator', resultText: 'Islamabad United won by 3 runs' },
  { matchId: 'sr:match:demo:psls4', seasonId: 'sr:season:demo:psl', status: 'closed', scheduled: '2026-03-20T14:00:00+00:00', homeTeamId: 'sr:competitor:243436', homeTeamName: 'Lahore Qalandars', homeTeamAbbr: 'LQA', awayTeamId: 'sr:competitor:243437', awayTeamName: 'Karachi Kings', awayTeamAbbr: 'KAR', venue: 'Gaddafi Stadium, Lahore', round: 'Match 31', resultText: 'Lahore Qalandars won by 17 runs' },
  { matchId: 'sr:match:demo:psls5', seasonId: 'sr:season:demo:psl', status: 'live', scheduled: '2026-09-07T14:00:00+00:00', homeTeamId: 'sr:competitor:243436', homeTeamName: 'Lahore Qalandars', homeTeamAbbr: 'LQA', awayTeamId: 'sr:competitor:243440', awayTeamName: 'Multan Sultans', awayTeamAbbr: 'MUL', venue: 'Gaddafi Stadium, Lahore', round: 'Match 32' },
];

export const demoPslLeaders = [
  {
    category: 'batting',
    stat: 'top_runs',
    entries: [
      { rank: 1, playerId: 'sr:player:demo:1', playerName: 'Khan, Yasir', teamAbbr: 'RAW', teamName: 'Rawalpindi', value: 640 },
      { rank: 2, playerId: 'sr:player:demo:2', playerName: 'Zaman, Fakhar', teamAbbr: 'LQA', teamName: 'Lahore Qalandars', value: 612 },
      { rank: 3, playerId: 'sr:player:demo:3', playerName: 'Shafique, Abdullah', teamAbbr: 'LQA', teamName: 'Lahore Qalandars', value: 588 },
    ],
  },
  {
    category: 'bowling',
    stat: 'top_wickets',
    entries: [
      { rank: 1, playerId: 'sr:player:demo:4', playerName: 'Afridi, Shaheen', teamAbbr: 'LQA', teamName: 'Lahore Qalandars', value: 22 },
      { rank: 2, playerId: 'sr:player:demo:5', playerName: 'Shaah, Arafat', teamAbbr: 'PZA', teamName: 'Peshawar Zalmi', value: 19 },
      { rank: 3, playerId: 'sr:player:demo:6', playerName: 'Zahid, Umar', teamAbbr: 'ISL', teamName: 'Islamabad United', value: 17 },
    ],
  },
];

export const demoTours: Record<string, any[]> = {};

export const demoPslSquads = [
  {
    teamId: 'sr:competitor:243436',
    teamName: 'Lahore Qalandars',
    teamAbbr: 'LQA',
    manager: 'Aqib Javed',
    players: [
      { playerId: 'sr:player:demo:2', fullName: 'Fakhar Zaman', shortName: 'Zaman, Fakhar', role: 'batsman', battingStyle: 'left-handed', nationality: 'Pakistan' },
      { playerId: 'sr:player:demo:3', fullName: 'Abdullah Shafique', shortName: 'Shafique, Abdullah', role: 'batsman', battingStyle: 'right-handed', nationality: 'Pakistan' },
      { playerId: 'sr:player:demo:4', fullName: 'Shaheen Afridi', shortName: 'Afridi, Shaheen', role: 'bowler', bowlingStyle: 'left-arm_fast', nationality: 'Pakistan' },
    ],
  },
  {
    teamId: 'sr:competitor:243432',
    teamName: 'Peshawar Zalmi',
    teamAbbr: 'PZA',
    manager: 'Danny Morrison',
    players: [
      { playerId: 'sr:player:demo:5', fullName: 'Arafat Shaah', shortName: 'Shaah, Arafat', role: 'bowler', bowlingStyle: 'right-arm_fast', nationality: 'Pakistan' },
      { playerId: 'sr:player:demo:7', fullName: 'Babar Azam', shortName: 'Azam, Babar', role: 'batsman', battingStyle: 'right-handed', nationality: 'Pakistan' },
    ],
  },
];