import type { AssistantIntent, AssistantUnavailable } from '@cricapp/shared-types';

export function buildFollowUpPrompts(input: {
  intent: AssistantIntent;
  verified: Record<string, unknown>;
  unavailable: AssistantUnavailable[];
}): string[] {
  if (input.unavailable.some((u) => u.field === 'scope')) {
    return [
      'PSL 2026 playoff cutoff',
      'Compare players Babar Azam vs Mohammad Rizwan',
      'Lahore Qalandars vs Karachi Kings H2H',
    ];
  }

  switch (input.intent) {
    case 'player_compare':
      return [
        'How has Babar Azam been in PSL 2026?',
        'Can Multan Sultans make the playoffs?',
        'Lahore vs Karachi head to head',
      ];
    case 'team_head_to_head':
      return [
        'Compare players Babar Azam vs Mohammad Rizwan',
        'PSL 2026 standings playoff cutoff',
        'Recent form of Shaheen Afridi',
      ];
    case 'standings_qualification':
      return [
        'Can Lahore Qalandars qualify?',
        'Compare Babar vs Rizwan in PSL 2026',
        'Islamabad vs Peshawar H2H',
      ];
    case 'player_recent_form':
      return [
        'Compare this player vs Mohammad Rizwan',
        'PSL playoff cutoff 2026',
        'India vs Pakistan head to head',
      ];
    case 'match_prediction_summary':
    case 'live_win_prob_explain':
      return ['Why did win probability change?', 'Head to head for these teams'];
    case 'unknown':
      return [
        'PSL 2026 playoff cutoff',
        'Babar Azam vs Mohammad Rizwan',
        'India vs Pakistan H2H',
      ];
    default: {
      const _exhaustive: never = input.intent;
      return _exhaustive;
    }
  }
}
