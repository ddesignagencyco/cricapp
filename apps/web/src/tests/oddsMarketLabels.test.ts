import {
  cleanProviderLabel,
  isHiddenSelection,
  marketLabel,
  partitionMarkets,
  selectionLabel,
} from '../lib/oddsMarketLabels';
import { formatPayoutPercent } from '../lib/oddsDisplay';

/**
 * The odds page used to print the odds feed's own strings, which is why the tabs read
 * "Match winner (incl. super over)" and the table carried a "Draw" column. These tests
 * pin the plain-English contract: a reader sees a short tab they recognise, team names
 * as column headings, and nothing that cricket does not have.
 */

describe('market names a reader recognises', () => {
  it('turns the feed wording into the label the industry uses', () => {
    expect(marketLabel({ marketKey: 'match_winner', name: 'Match winner (incl. super over)' }))
      .toBe('Match Winner');
    expect(marketLabel({ marketKey: 'match_winner', name: 'Moneyline' })).toBe('Match Winner');
    expect(marketLabel({ marketKey: '1', name: 'Toss Winner' })).toBe('Toss Winner');
    expect(marketLabel({ marketKey: '2', name: 'Top Batsman' })).toBe('Top Batsman');
    expect(marketLabel({ marketKey: '3', name: 'Highest Wicket Taker' })).toBe('Top Bowler');
    expect(marketLabel({ marketKey: '4', name: 'Man of the Match' })).toBe('Player of the Match');
  });

  it('never prints the raw feed qualifier', () => {
    const shown = marketLabel({ marketKey: 'x', name: 'Match winner (incl. super over)' });
    expect(shown).not.toMatch(/[()]/);
    expect(cleanProviderLabel('India (incl. super over)')).toBe('India');
    expect(cleanProviderLabel('Top Batsman (90 mins)')).toBe('Top Batsman');
  });

  it('falls back to something readable for a market it does not know', () => {
    expect(marketLabel({ marketKey: 'first_ball_result', name: '' })).toBe('First Ball Result');
    expect(marketLabel({ marketKey: '', name: '' })).toBe('Other Market');
  });

  it('puts the recognisable markets first, in a fixed order, whatever arrives', () => {
    const { common } = partitionMarkets([
      { marketKey: 'zz', name: 'Top Batsman' },
      { marketKey: 'aa', name: 'Match Winner' },
      { marketKey: 'mm', name: 'Toss Winner' },
    ]);
    expect(common.map(marketLabel)).toEqual(['Match Winner', 'Toss Winner', 'Top Batsman']);

    // Reversed input must produce the same order, so tabs do not shuffle as prices
    // arrive or as the feed reorders its response.
    const reversed = partitionMarkets([
      { marketKey: 'mm', name: 'Toss Winner' },
      { marketKey: 'aa', name: 'Match Winner' },
      { marketKey: 'zz', name: 'Top Batsman' },
    ]);
    expect(reversed.common.map(marketLabel)).toEqual(common.map(marketLabel));
  });

  it('matches the provider spellings a real feed actually sends', () => {
    // Regression: the first pass only matched "highest batter" / "most wickets", so
    // `top_batter` — the most common cricket market there is — fell through to the
    // "More markets" disclosure and disappeared from the tab row.
    expect(marketLabel({ marketKey: 'top_batter', name: 'Top Batter' })).toBe('Top Batsman');
    expect(marketLabel({ marketKey: 'top_bowler', name: 'Top Bowler' })).toBe('Top Bowler');
    expect(marketLabel({ marketKey: 'top_batter', name: 'Top Batsman' })).toBe('Top Batsman');

    const { common, more } = partitionMarkets([
      { marketKey: 'match_winner', name: 'Match Winner' },
      { marketKey: 'top_batter', name: 'Top Batter' },
    ]);
    expect(common).toHaveLength(2);
    expect(more).toHaveLength(0);
  });

  it('files markets it cannot name behind the disclosure instead of dropping them', () => {
    const { common, more } = partitionMarkets([
      { marketKey: 'match_winner', name: 'Match Winner' },
      { marketKey: 'obscure', name: 'Number of Sixes in Over 42' },
    ]);
    expect(common.map(marketLabel)).toEqual(['Match Winner']);
    expect(more.map(marketLabel)).toEqual(['Number Of Sixes In Over 42']);
  });
});

describe('selection columns', () => {
  it('uses the team names, so the columns read as the two teams', () => {
    expect(selectionLabel('home', 'India', 'West Indies')).toBe('India');
    expect(selectionLabel('away', 'India', 'West Indies')).toBe('West Indies');
  });

  it('drops Draw, because cricket has no draw', () => {
    expect(isHiddenSelection('draw')).toBe(true);
    expect(isHiddenSelection('DRAW')).toBe(true);
    expect(selectionLabel('draw', 'India', 'West Indies')).toBeTruthy();
  });

  it('keeps the outcomes cricket does have', () => {
    expect(isHiddenSelection('tie')).toBe(false);
    expect(isHiddenSelection('no_result')).toBe(false);
    expect(selectionLabel('tie', 'India', 'WI')).toBe('Tie');
    expect(selectionLabel('no_result', 'India', 'WI')).toBe('No result');
  });

  it('cleans a provider selection label instead of printing it raw', () => {
    expect(selectionLabel('over_1', 'India', 'WI', 'Over 1 (1-6)')).toBe('Over 1');
  });
});

describe('payout, not margin', () => {
  it('reads as a payout percentage', () => {
    expect(formatPayoutPercent(0.06)).toBe('94%');
    expect(formatPayoutPercent(0)).toBe('100%');
    expect(formatPayoutPercent(null)).toBe('');
  });
});
