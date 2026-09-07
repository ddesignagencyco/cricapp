function sportEvent(id: string, home: any, away: any, scheduled: string, tournamentName: string, venueName: string) {
  return {
    id,
    scheduled,
    tournament: { id: 'sr:tournament:demo:psl', name: tournamentName },
    venue: { name: venueName },
    competitors: [
      { id: home.id, name: home.name, abbreviation: home.abbr, qualifier: 'home' },
      { id: away.id, name: away.name, abbreviation: away.abbr, qualifier: 'away' },
    ],
  };
}

const LQA = { id: 'sr:competitor:243436', name: 'Lahore Qalandars', abbr: 'LQA' };
const PZA = { id: 'sr:competitor:243432', name: 'Peshawar Zalmi', abbr: 'PZA' };
const ISL = { id: 'sr:competitor:243430', name: 'Islamabad United', abbr: 'ISL' };
const KAR = { id: 'sr:competitor:243437', name: 'Karachi Kings', abbr: 'KAR' };

export const demoHeadToHead = {
  teamAId: LQA.id,
  teamBId: PZA.id,
  payload: {
    competitors: [
      { id: LQA.id, name: LQA.name, abbreviation: LQA.abbr, qualifier: 'home' },
      { id: PZA.id, name: PZA.name, abbreviation: PZA.abbr, qualifier: 'away' },
    ],
    generated_at: '2026-09-07T08:00:00Z',
    last_meetings: [
      {
        sport_event: sportEvent('sr:match:demo:h2h1', LQA, PZA, '2026-03-21T14:00:00+00:00', 'Pakistan Super League 2026', 'Gaddafi Stadium, Lahore'),
        sport_event_status: {
          status: 'closed',
          winner_id: LQA.id,
          display_score: '178/6',
          match_result_text: 'Lahore Qalandars won by 4 wickets',
          match_status: 'ended',
          result: 'Lahore Qalandars won by 4 wickets',
        },
      },
      {
        sport_event: sportEvent('sr:match:demo:h2h2', PZA, LQA, '2026-02-28T14:00:00+00:00', 'Pakistan Super League 2026', 'Rawalpindi Cricket Stadium'),
        sport_event_status: {
          status: 'closed',
          winner_id: PZA.id,
          display_score: '191/8',
          match_result_text: 'Peshawar Zalmi won by 12 runs',
          match_status: 'ended',
          result: 'Peshawar Zalmi won by 12 runs',
        },
      },
      {
        sport_event: sportEvent('sr:match:demo:h2h3', LQA, PZA, '2025-03-09T14:00:00+00:00', 'Pakistan Super League 2025', 'Gaddafi Stadium, Lahore'),
        sport_event_status: {
          status: 'closed',
          winner_id: LQA.id,
          display_score: '172/5',
          match_result_text: 'Lahore Qalandars won by 5 wickets',
          match_status: 'ended',
          result: 'Lahore Qalandars won by 5 wickets',
        },
      },
    ],
    next_meetings: [
      sportEvent('sr:match:demo:h2hf1', LQA, PZA, '2026-09-10T14:00:00+00:00', 'Pakistan Super League 2026', 'Gaddafi Stadium, Lahore'),
    ],
  },
};

export const demoHeadToHeadLibrary: Record<string, any> = {
  [`${LQA.id}|${PZA.id}`]: demoHeadToHead,
  [`${LQA.id}|${KAR.id}`]: {
    teamAId: LQA.id,
    teamBId: KAR.id,
    payload: {
      competitors: [
        { id: LQA.id, name: LQA.name, abbreviation: LQA.abbr, qualifier: 'home' },
        { id: KAR.id, name: KAR.name, abbreviation: KAR.abbr, qualifier: 'away' },
      ],
      generated_at: '2026-09-07T08:00:00Z',
      last_meetings: [
        {
          sport_event: sportEvent('sr:match:demo:h2h4', LQA, KAR, '2026-03-03T14:00:00+00:00', 'Pakistan Super League 2026', 'Gaddafi Stadium, Lahore'),
          sport_event_status: {
            status: 'closed',
            winner_id: LQA.id,
            display_score: '184/6',
            match_result_text: 'Lahore Qalandars won by 3 wickets',
            match_status: 'ended',
            result: 'Lahore Qalandars won by 3 wickets',
          },
        },
        {
          sport_event: sportEvent('sr:match:demo:h2h5', KAR, LQA, '2025-03-14T14:00:00+00:00', 'Pakistan Super League 2025', 'National Bank Stadium, Karachi'),
          sport_event_status: {
            status: 'closed',
            winner_id: KAR.id,
            display_score: '164/7',
            match_result_text: 'Karachi Kings won by 2 wickets',
            match_status: 'ended',
            result: 'Karachi Kings won by 2 wickets',
          },
        },
      ],
      next_meetings: [],
    },
  },
  [`${LQA.id}|${ISL.id}`]: {
    teamAId: LQA.id,
    teamBId: ISL.id,
    payload: {
      competitors: [
        { id: LQA.id, name: LQA.name, abbreviation: LQA.abbr, qualifier: 'home' },
        { id: ISL.id, name: ISL.name, abbreviation: ISL.abbr, qualifier: 'away' },
      ],
      generated_at: '2026-09-07T08:00:00Z',
      last_meetings: [
        {
          sport_event: sportEvent('sr:match:demo:h2h6', ISL, LQA, '2026-03-22T14:00:00+00:00', 'Pakistan Super League 2026', 'Rawalpindi Cricket Stadium'),
          sport_event_status: {
            status: 'closed',
            winner_id: ISL.id,
            display_score: '156/7',
            match_result_text: 'Islamabad United won by 3 runs',
            match_status: 'ended',
            result: 'Islamabad United won by 3 runs',
          },
        },
        {
          sport_event: sportEvent('sr:match:demo:h2h7', LQA, ISL, '2025-03-06T14:00:00+00:00', 'Pakistan Super League 2025', 'Gaddafi Stadium, Lahore'),
          sport_event_status: {
            status: 'closed',
            winner_id: LQA.id,
            display_score: '188/5',
            match_result_text: 'Lahore Qalandars won by 20 runs',
            match_status: 'ended',
            result: 'Lahore Qalandars won by 20 runs',
          },
        },
      ],
      next_meetings: [],
    },
  },
};

export function getDemoHeadToHead(a: string, b: string) {
  return demoHeadToHeadLibrary[`${a}|${b}`] || null;
}