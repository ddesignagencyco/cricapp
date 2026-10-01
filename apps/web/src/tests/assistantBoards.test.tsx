import userEvent from '@testing-library/user-event';
import AnswerBoard from '../components/assistant/AnswerBoard';
import AssistantPanel from '../components/assistant/AssistantPanel';
import VerifiedDetails from '../components/assistant/VerifiedDetails';
import SourceChips from '../components/assistant/SourceChips';
import UnavailableBanner from '../components/assistant/UnavailableBanner';
import * as assistantService from '../services/assistant';
import type { AssistantAskResponse } from '../services/assistant';
import type { AssistantPageContext } from '../lib/assistant';
import { render, screen } from '@testing-library/react';

function reply(overrides: Partial<AssistantAskResponse> = {}): AssistantAskResponse {
  return {
    intent: 'unknown',
    answerText: 'Answer text.',
    verified: {},
    sources: [],
    unavailable: [],
    llmNarrative: false,
    ...overrides,
  };
}

describe('AnswerBoard — head to head', () => {
  it('shows the win split with the series score', () => {
    render(
      <AnswerBoard
        reply={reply({
          intent: 'team_head_to_head',
          verified: {
            teamAName: 'Lahore Qalandars',
            teamBName: 'Karachi Kings',
            teamAWins: 4,
            teamBWins: 2,
            draws: 1,
            totalMeetings: 7,
          },
        })}
      />,
    );
    expect(screen.getByText('Lahore Qalandars')).toBeTruthy();
    expect(screen.getByText('4–2')).toBeTruthy();
    expect(screen.getByText(/7 completed/)).toBeTruthy();
    expect(screen.getByText(/1 no-result/)).toBeTruthy();
  });

  it('renders nothing when no meetings are stored', () => {
    const { container } = render(
      <AnswerBoard
        reply={reply({
          intent: 'team_head_to_head',
          verified: { teamAName: 'A', teamBName: 'B', teamAWins: 0, teamBWins: 0, totalMeetings: 0 },
        })}
      />,
    );
    expect(container.textContent).toBe('');
  });
});

describe('AnswerBoard — player compare', () => {
  it('formats rate and average stats to two decimals', () => {
    render(
      <AnswerBoard
        reply={reply({
          intent: 'player_compare',
          verified: {
            seasonName: 'Pakistan Super League 2026',
            playerA: { name: 'Azam, Babar' },
            playerB: { name: 'Rizwan, Mohammad' },
            comparisons: [
              { category: 'batting', stat: 'top_average', playerAValue: 52.5, playerBValue: 47.333, leader: 'a' },
              { category: 'bowling', stat: 'best_economy', playerAValue: 7.5, playerBValue: 7.85, leader: 'b' },
            ],
          },
        })}
      />,
    );
    expect(screen.getByText('Babar Azam')).toBeTruthy();
    // Sportradar stores "Rizwan, Mohammad"; the board flips it for the reader.
    expect(screen.getByText('Mohammad Rizwan')).toBeTruthy();
    // Raw floats would print as 52.5 / 47.333 / 7.5 / 7.85 and read as a bug.
    expect(screen.getByText('52.50')).toBeTruthy();
    expect(screen.getByText('47.33')).toBeTruthy();
    expect(screen.getByText('7.50')).toBeTruthy();
    expect(screen.getByText('7.85')).toBeTruthy();
  });

  it('does not drop rows that share a stat name across categories', () => {
    const { container } = render(
      <AnswerBoard
        reply={reply({
          intent: 'player_compare',
          verified: {
            playerA: { name: 'A' },
            playerB: { name: 'B' },
            comparisons: [
              { category: 'batting', stat: 'top_average', playerAValue: 40, playerBValue: 30, leader: 'a' },
              { category: 'bowling', stat: 'top_average', playerAValue: 25, playerBValue: 20, leader: 'a' },
            ],
          },
        })}
      />,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });
});

describe('AnswerBoard — prediction', () => {
  it('splits the bar across the full width even when the probs do not total 100', () => {
    const { container } = render(
      <AnswerBoard
        reply={reply({
          intent: 'match_prediction_summary',
          verified: { homeWinProb: 0.62, awayWinProb: 0.3, stage: 'pre_match', calibrationBand: 'mid' },
        })}
      />,
    );
    expect(screen.getByText('62%')).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy();
    const bars = container.querySelectorAll('.bg-accent, .bg-mtext\\/20');
    const widths = Array.from(bars).map((node) => (node as HTMLElement).style.width);
    expect(widths).toEqual(['67%', '33%']);
  });

  it('shows the previous figures alongside the shift', () => {
    render(
      <AnswerBoard
        reply={reply({
          intent: 'live_win_prob_explain',
          verified: {
            latestHomeWinProb: 0.64,
            latestAwayWinProb: 0.36,
            previousHomeWinProb: 0.55,
            previousAwayWinProb: 0.45,
            homeWinProbDelta: 0.09,
            latestOver: 14,
            latestReasons: ['required run rate up', 'wickets in hand'],
          },
        })}
      />,
    );
    expect(screen.getByText(/\+9 pts/)).toBeTruthy();
    expect(screen.getByText(/over 14/)).toBeTruthy();
    expect(screen.getByText(/was 55\/45/)).toBeTruthy();
    expect(screen.getByText('required run rate up')).toBeTruthy();
  });

  it('shows a dash, not zero, when no run is stored', () => {
    const { container } = render(
      <AnswerBoard reply={reply({ intent: 'match_prediction_summary', verified: { homeWinProb: 0 } })} />,
    );
    // 0 is a real value and must survive, unlike a missing field.
    expect(screen.getByText('0%')).toBeTruthy();
    expect(container.textContent).toContain('—');
  });
});

describe('AnswerBoard — qualification', () => {
  it('prints NRR to three decimals so the ordering survives', () => {
    render(
      <AnswerBoard
        reply={reply({
          intent: 'standings_qualification',
          verified: {
            seasonName: 'Pakistan Super League 2026',
            playoffCutoffPoints: 8,
            playoffSpots: 4,
            focusTeam: {
              teamName: 'Karachi Kings',
              rank: 6,
              points: 6,
              netRunRate: 0.3149,
              inPlayoffPosition: false,
              mathematicallyAlive: true,
              remainingFixtures: 2,
              maxPossiblePoints: 10,
            },
          },
        })}
      />,
    );
    expect(screen.getByText(/NRR 0\.315/)).toBeTruthy();
    expect(screen.getByText(/still alive/)).toBeTruthy();
    expect(screen.getByText(/2 fixtures left, up to 10 pts/)).toBeTruthy();
  });
});

describe('AnswerBoard — recent form', () => {
  it('marks not out and shows balls faced', () => {
    render(
      <AnswerBoard
        reply={reply({
          intent: 'player_recent_form',
          verified: {
            playerName: 'Azam, Babar',
            totals: { runs: 96, wickets: 0, matchesWithData: 2 },
            recentMatches: [
              {
                matchId: 'sr:match:1',
                opponentLabel: 'Karachi Kings',
                batting: { runs: 40, balls: 32, notOut: true },
                bowling: null,
              },
              {
                matchId: 'sr:match:2',
                opponentLabel: 'Quetta Gladiators',
                batting: { runs: 56, balls: 44, notOut: false },
                bowling: { wickets: 2 },
              },
            ],
          },
        })}
      />,
    );
    expect(screen.getByText('40* (32b)')).toBeTruthy();
    expect(screen.getByText(/56 \(44b\)/)).toBeTruthy();
    expect(screen.getByText(/2 wkts/)).toBeTruthy();
    expect(screen.getByText(/2 stored matches · 96 runs/)).toBeTruthy();
  });
});

describe('VerifiedDetails', () => {
  it('stays collapsed until asked, then lists the stored figures', async () => {
    const user = userEvent.setup();
    render(
      <VerifiedDetails
        reply={reply({
          verified: {
            teamAName: 'Lahore Qalandars',
            teamAWins: 4,
            teamBName: 'Karachi Kings',
            teamBWins: 2,
            totalMeetings: 6,
          },
        })}
      />,
    );

    const toggle = screen.getByRole('button', { name: /verified figures/i });
    expect(toggle.textContent).toMatch(/\(5\)/);
    expect(screen.queryByText('Lahore Qalandars')).toBeNull();

    await user.click(toggle);
    expect(screen.getByText('Lahore Qalandars')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('keeps a zero figure instead of hiding it', async () => {
    const user = userEvent.setup();
    render(<VerifiedDetails reply={reply({ verified: { teamAWins: 0, teamBWins: 3 } })} />);
    await user.click(screen.getByRole('button', { name: /verified figures/i }));
    expect(screen.getByText('A wins')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders probabilities as percentages', async () => {
    const user = userEvent.setup();
    render(<VerifiedDetails reply={reply({ verified: { homeWinProb: 0.615 } })} />);
    await user.click(screen.getByRole('button', { name: /verified figures/i }));
    expect(screen.getByText('62%')).toBeTruthy();
  });

  it('hides opaque ids from the grid but keeps them in the raw payload', async () => {
    const user = userEvent.setup();
    render(<VerifiedDetails reply={reply({ verified: { matchId: 'sr:match:41234', totalMeetings: 3 } })} />);
    await user.click(screen.getByRole('button', { name: /verified figures/i }));
    expect(screen.queryByText('sr:match:41234')).toBeNull();

    await user.click(screen.getByRole('button', { name: /raw verified payload/i }));
    expect(screen.getByText(/"sr:match:41234"/)).toBeTruthy();
  });

  it('summarises a nested focus team instead of dumping its keys', async () => {
    const user = userEvent.setup();
    render(
      <VerifiedDetails
        reply={reply({ verified: { focusTeam: { rank: 5, points: 6, netRunRate: 0.12 } } })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /verified figures/i }));
    expect(screen.getByText('#5 · 6 pts · NRR 0.120')).toBeTruthy();
  });

  it('renders nothing at all when there are no verified figures', () => {
    const { container } = render(<VerifiedDetails reply={reply()} />);
    expect(container.textContent).toBe('');
  });
});

describe('UnavailableBanner', () => {
  it('drops a reason already written into the answer text', () => {
    const { container } = render(
      <UnavailableBanner
        items={[{ field: 'player', reason: 'No player matched "X".' }]}
        answerText={'I could not answer. No player matched "X".'}
      />,
    );
    expect(container.textContent).toBe('');
  });

  it('labels an out-of-scope notice differently from a missing-data one', () => {
    render(
      <UnavailableBanner
        items={[{ field: 'scope', reason: 'World Cup history is not stored here.' }]}
      />,
    );
    expect(screen.getByText(/Out of this database:/)).toBeTruthy();
  });
});

describe('SourceChips', () => {
  it('links a head-to-head to the teams comparison view', () => {
    render(
      <SourceChips sources={[{ type: 'head_to_head', teamAId: 'sr:c:1', teamBId: 'sr:c:2' }]} />,
    );
    expect(screen.getByText('Head to head').getAttribute('href')).toBe('/teams?a=sr:c:1&b=sr:c:2');
  });

  it('renders nothing when there are no sources', () => {
    const { container } = render(<SourceChips sources={[]} />);
    expect(container.textContent).toBe('');
  });
});

describe('AssistantPanel — starter chips', () => {
  const context: AssistantPageContext = {
    slots: {},
    starters: [
      { question: 'What is the PSL 2026 playoff cutoff?' },
      { question: 'How has Babar Azam been in PSL 2026?', intent: 'player_recent_form' },
    ],
  };

  it('renders the whole question on the chip, not a shortened label', () => {
    render(<AssistantPanel open onClose={() => {}} context={context} />);
    expect(screen.getByRole('button', { name: 'What is the PSL 2026 playoff cutoff?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'How has Babar Azam been in PSL 2026?' })).toBeTruthy();
  });

  it('teaches the phrasing it understands in the empty state', () => {
    render(<AssistantPanel open onClose={() => {}} context={context} />);
    expect(screen.getByText(/These are the phrasings I understand best/)).toBeTruthy();
    expect(screen.getByText(/A vs B head to head/)).toBeTruthy();
    expect(screen.getByText(/Compare players X vs Y/)).toBeTruthy();
  });

  it('sends the question the chip displays', async () => {
    const user = userEvent.setup();
    const ask = jest.fn().mockResolvedValue({
      intent: 'unknown',
      answerText: 'Answer.',
      verified: {},
      sources: [],
      unavailable: [],
      llmNarrative: false,
    });
    jest.spyOn(assistantService, 'askAssistant').mockImplementation(ask);

    render(<AssistantPanel open onClose={() => {}} context={context} />);
    await user.click(screen.getByRole('button', { name: 'What is the PSL 2026 playoff cutoff?' }));

    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][0].question).toBe('What is the PSL 2026 playoff cutoff?');
  });
});