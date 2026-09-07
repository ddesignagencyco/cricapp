export const demoTimeline = {
  matchId: 'sr:match:demo:live001',
  payload: {
    sport_event: {
      id: 'sr:match:demo:live001',
      scheduled: '2026-09-07T14:00:00+00:00',
      tournament: { id: 'sr:tournament:demo:psl', name: 'Pakistan Super League 2026' },
      venue: { name: 'Gaddafi Stadium, Lahore' },
      competitors: [
        { id: 'sr:competitor:243436', name: 'Lahore Qalandars', abbreviation: 'LQA', qualifier: 'home' },
        { id: 'sr:competitor:243440', name: 'Multan Sultans', abbreviation: 'MUL', qualifier: 'away' },
      ],
    },
    sport_event_status: {
      status: 'live',
      match_status: 'in_progress',
      display_score: '167/5',
      display_overs: 18.2,
    },
    timeline: [
      { id: 'sr:timeline:1', type: 'score_change', sport_event: 'sr:match:demo:live001', time: '17.4', competitors: [{ id: 'sr:competitor:243436', qualifier: 'home', score: { value: 148, wickets: 4, display_score: '148/4', display_overs: 17.4 } }] },
      { id: 'sr:timeline:2', type: 'wicket', sport_event: 'sr:match:demo:live001', time: '18.0', competitors: [{ id: 'sr:competitor:243436', qualifier: 'home', score: { value: 150, wickets: 5, display_score: '150/5', display_overs: 18 } }], players: [{ id: 'sr:player:demo1' }] },
      { id: 'sr:timeline:3', type: 'score_change', sport_event: 'sr:match:demo:live001', time: '18.2', competitors: [{ id: 'sr:competitor:243436', qualifier: 'home', score: { value: 167, wickets: 5, display_score: '167/5', display_overs: 18.2 } }] },
    ],
  },
};

export function getDemoTimeline(_matchId: string) {
  return demoTimeline;
}

export const demoPlayerProfile = {
  id: 'sr:player:demo:shaheen',
  fullName: 'Shaheen Afridi',
  shortName: 'Afridi, Shaheen',
  role: 'bowler',
  battingStyle: 'left-handed',
  bowlingStyle: 'left-arm_fast',
  birth: '2000-04-06',
  nationality: 'Pakistan',
  countryCode: 'PAK',
  jerseyNumber: 10,
  height: 198,
  team: {
    id: 'sr:competitor:243436',
    name: 'Lahore Qalandars',
    abbr: 'LQA',
    country: 'Pakistan',
    logoUrl: null,
    manager: null,
  },
  recentMatches: [
    { matchId: 'sr:match:demo:ts1', status: 'completed', teams: ['PZA', 'LQA'], teamNames: ['Peshawar Zalmi', 'Lahore Qalandars'], tournament: 'Pakistan Super League 2026', displayScore: '178/6', scheduled: '2026-03-24T14:00:00+00:00' },
    { matchId: 'sr:match:demo:ts2', status: 'completed', teams: ['ISL', 'LQA'], teamNames: ['Islamabad United', 'Lahore Qalandars'], tournament: 'Pakistan Super League 2026', displayScore: '156/7', scheduled: '2026-03-22T14:00:00+00:00' },
    { matchId: 'sr:match:demo:ts3', status: 'live', teams: ['LQA', 'MUL'], teamNames: ['Lahore Qalandars', 'Multan Sultans'], tournament: 'Pakistan Super League 2026', displayScore: '167/5', scheduled: '2026-09-07T14:00:00+00:00' },
  ],
  providerProfile: {
    statistics: {
      bowling: {
        t20: { matches: '86', wickets: '134', economy: '8.02', average: '22.1' },
        test: { matches: '29', wickets: '108', economy: '3.24', average: '26.0' },
        odi: { matches: '54', wickets: '97', economy: '5.48', average: '24.8' },
      },
    },
  },
};

export function getDemoPlayerProfile(playerId: string) {
  return demoTournamentTeamPlayerMatches(playerId);
}

function demoTournamentTeamPlayerMatches(playerId: string) {
  if (playerId.includes('demo')) return demoPlayerProfile;
  return null;
}