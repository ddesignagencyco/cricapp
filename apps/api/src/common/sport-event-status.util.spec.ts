import { describe, it, expect } from '@jest/globals';
import { sportEventStatusFromPayload } from './sport-event-status.util.js';

describe('sport-event-status.util', () => {
  it('extracts toss and winner from team results payload', () => {
    const view = sportEventStatusFromPayload({
      sport_event: { id: 'sr:match:1' },
      sport_event_status: {
        winner_id: 'sr:competitor:107203',
        toss_won_by: 'sr:competitor:107203',
        toss_decision: 'bowl',
        current_inning: 2,
        display_score: '163/3',
        match_result_text: 'India won by 7 wickets',
        period_scores: [{ home_score: 159, away_score: 163, type: 'inning', number: 2 }],
      },
    });
    expect(view?.winnerId).toBe('sr:competitor:107203');
    expect(view?.tossWonBy).toBe('sr:competitor:107203');
    expect(view?.tossDecision).toBe('bowl');
    expect(view?.currentInning).toBe(2);
    expect(view?.periodScores).toHaveLength(1);
  });
});
