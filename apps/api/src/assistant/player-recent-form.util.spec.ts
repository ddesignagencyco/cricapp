import { describe, it, expect } from '@jest/globals';
import {
  aggregatePlayerStatsFromTimeline,
  extractPlayerStatsFromMatchSummary,
} from './player-recent-form.util.js';

describe('player-recent-form.util', () => {
  it('extracts batting from match_summary statistics.players', () => {
    const payload = {
      statistics: {
        innings: [
          {
            number: 1,
            teams: [
              {
                id: 'sr:competitor:1',
                statistics: {
                  batting: {
                    players: [
                      {
                        id: 'sr:player:p1',
                        name: 'Babar Azam',
                        runs: 72,
                        balls: 58,
                        strike_rate: 124.1,
                        dismissal: 'caught',
                      },
                    ],
                  },
                },
              },
            ],
          },
        ],
      },
    };
    const out = extractPlayerStatsFromMatchSummary(payload, 'sr:player:p1', 'Babar Azam');
    expect(out.batting?.runs).toBe(72);
    expect(out.batting?.balls).toBe(58);
    expect(out.batting?.notOut).toBe(false);
  });

  it('aggregates striker runs from timeline deliveries', () => {
    const payload = {
      timeline: [
        {
          type: 'ball',
          over_number: 1,
          ball_number: 1,
          batting_params: { striker: { id: 'sr:player:p1', name: 'Babar Azam' }, runs_scored: 4 },
          bowling_params: { bowler: { id: 'sr:player:x', name: 'Other' } },
        },
        {
          type: 'ball',
          over_number: 1,
          ball_number: 2,
          batting_params: { striker: { id: 'sr:player:p1', name: 'Babar Azam' }, runs_scored: 1 },
          bowling_params: { bowler: { id: 'sr:player:x', name: 'Other' } },
        },
      ],
    };
    const out = aggregatePlayerStatsFromTimeline(payload, 'sr:player:p1', 'Babar Azam');
    expect(out.batting?.runs).toBe(5);
    expect(out.batting?.balls).toBe(2);
  });
});
