import { dedupeOpponents } from '../components/boards/TeamHeadToHead';

const catalog: any[] = [
  { id: 'cb:team:334', name: 'Peshawar Zalmi', abbr: 'PSZ' },
  { id: 'cb:team:330', name: 'Islamabad United', abbr: 'ISU' },
  { id: 'cb:team:333', name: 'Lahore Qalandars', abbr: 'LHQ' },
  { id: 'cb:team:9', name: 'Elsewhere', abbr: 'ELS' },
];
const team = { id: 'cb:team:334', abbr: 'PSZ' };

const record = (a: string, b: string) => ({
  kind: 'team_results',
  payload: { sport_event: { competitors: [{ id: a }, { id: b }] } },
});

describe('dedupeOpponents', () => {
  it('finds opponents from stored schedule/result records, once each, sorted by name', () => {
    const opponents = dedupeOpponents(
      team,
      [record('cb:team:334', 'cb:team:333'), record('cb:team:330', 'cb:team:334'), record('cb:team:334', 'cb:team:330')],
      catalog,
    );
    expect(opponents.map((o) => o.id)).toEqual(['cb:team:330', 'cb:team:333']);
  });

  it('also reads the code arrays match rows carry, and never lists the team itself', () => {
    const opponents = dedupeOpponents(team, [{ teams: ['PSZ', 'LHQ'] }], catalog);
    expect(opponents.map((o) => o.id)).toEqual(['cb:team:333']);
  });

  it('ignores competitors that are not in the team catalog, and bare-event payloads work too', () => {
    const bare = { payload: { competitors: [{ id: 'cb:team:334' }, { id: 'cb:team:9' }, { id: 'cb:team:404' }] } };
    expect(dedupeOpponents(team, [bare], catalog).map((o) => o.id)).toEqual(['cb:team:9']);
    expect(dedupeOpponents(team, [], catalog)).toEqual([]);
  });
});
