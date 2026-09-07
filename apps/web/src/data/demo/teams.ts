export const demoTeamSchedule: Record<string, any[]> = {
  'sr:competitor:243436': [
    {
      kind: 'team_schedule',
      scopeKey: 'sr:competitor:243436',
      eventId: 'sr:match:demo:ts1',
      status: 'closed',
      scheduled: '2026-03-24T14:00:00+00:00',
      payload: {
        sport_event: {
          id: 'sr:match:demo:ts1',
          scheduled: '2026-03-24T14:00:00+00:00',
          tournament: { id: 'sr:tournament:demo:psl', name: 'Pakistan Super League 2026' },
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
      kind: 'team_schedule',
      scopeKey: 'sr:competitor:243436',
      eventId: 'sr:match:demo:ts2',
      status: 'closed',
      scheduled: '2026-03-22T14:00:00+00:00',
      payload: {
        sport_event: {
          id: 'sr:match:demo:ts2',
          scheduled: '2026-03-22T14:00:00+00:00',
          tournament: { id: 'sr:tournament:demo:psl', name: 'Pakistan Super League 2026' },
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
      kind: 'team_schedule',
      scopeKey: 'sr:competitor:243436',
      eventId: 'sr:match:demo:ts3',
      status: 'live',
      scheduled: '2026-09-07T14:00:00+00:00',
      payload: {
        sport_event: {
          id: 'sr:match:demo:ts3',
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
      },
    },
  ],
};

export const demoTeamResults: Record<string, any[]> = {
  'sr:competitor:243436': [
    {
      kind: 'team_results',
      scopeKey: 'sr:competitor:243436',
      eventId: 'sr:match:demo:ts1',
      status: 'closed',
      scheduled: '2026-03-24T14:00:00+00:00',
      payload: {
        sport_event: {
          id: 'sr:match:demo:ts1',
          scheduled: '2026-03-24T14:00:00+00:00',
          tournament: { id: 'sr:tournament:demo:psl', name: 'Pakistan Super League 2026' },
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
      kind: 'team_results',
      scopeKey: 'sr:competitor:243436',
      eventId: 'sr:match:demo:ts2',
      status: 'closed',
      scheduled: '2026-03-22T14:00:00+00:00',
      payload: {
        sport_event: {
          id: 'sr:match:demo:ts2',
          scheduled: '2026-03-22T14:00:00+00:00',
          tournament: { id: 'sr:tournament:demo:psl', name: 'Pakistan Super League 2026' },
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
  ],
};

export const demoDailyResults = [
  {
    kind: 'daily_results',
    scopeKey: '2026-09-07',
    eventId: 'sr:match:demo:completed001',
    status: 'closed',
    scheduled: '2026-09-05T06:30:00+00:00',
    payload: {
      sport_event: {
        id: 'sr:match:demo:completed001',
        scheduled: '2026-09-05T06:30:00+00:00',
        tournament: { id: 'sr:tournament:demo:cl', name: 'ICC Cricket World Cup, Challenge League' },
        venue: { name: 'Royal Turf Club, Al Amerat' },
        competitors: [
          { id: 'sr:competitor:596242', name: 'Denmark', abbreviation: 'DEN', qualifier: 'home' },
          { id: 'sr:competitor:929839', name: 'Kuwait', abbreviation: 'KUW', qualifier: 'away' },
        ],
      },
      sport_event_status: {
        status: 'closed',
        match_status: 'ended',
        display_score: '310/8',
        match_result_text: 'Kuwait won by 2 wickets',
        winner_id: 'sr:competitor:929839',
      },
    },
  },
  {
    kind: 'daily_results',
    scopeKey: '2026-09-07',
    eventId: 'sr:match:demo:completed002',
    status: 'closed',
    scheduled: '2026-09-04T14:00:00+00:00',
    payload: {
      sport_event: {
        id: 'sr:match:demo:completed002',
        scheduled: '2026-09-04T14:00:00+00:00',
        tournament: { id: 'sr:tournament:demo:psl', name: 'Pakistan Super League 2026' },
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
];