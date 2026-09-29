import {
  assistantContextFromLocation,
  localAssistantReply,
  normalizeAssistantQuestion,
  assistantRequestSlots,
  assistantSessionId,
  sourceChipLabel,
  sourceHref,
  isScopeUnavailable,
} from '../lib/assistant';

describe('sourceHref', () => {
  it('links a match by matchId, falling back to id', () => {
    expect(sourceHref({ type: 'match', matchId: 'sr:match:1' } as never)).toBe('/matches/sr:match:1');
    expect(sourceHref({ type: 'match', id: 'sr:match:2' } as never)).toBe('/matches/sr:match:2');
  });

  it('returns null for a match with no id at all', () => {
    expect(sourceHref({ type: 'match' } as never)).toBeNull();
  });

  it('links a team and a player', () => {
    expect(sourceHref({ type: 'team', id: 'sr:competitor:1' } as never)).toBe('/teams/sr:competitor:1');
    expect(sourceHref({ type: 'player', id: 'sr:player:9' } as never)).toBe('/players/sr:player:9');
  });

  it('returns null for a team or player with no id', () => {
    expect(sourceHref({ type: 'team' } as never)).toBeNull();
    expect(sourceHref({ type: 'player' } as never)).toBeNull();
  });

  it('builds the head-to-head query with both ids', () => {
    expect(sourceHref({ type: 'head_to_head', teamAId: 'sr:c:1', teamBId: 'sr:c:2' } as never)).toBe(
      '/teams?a=sr:c:1&b=sr:c:2',
    );
  });

  it('falls back to the teams list when a head-to-head is missing an id', () => {
    expect(sourceHref({ type: 'head_to_head', teamAId: 'sr:c:1' } as never)).toBe('/teams');
  });

  it('links a prediction run by matchId, falling back to the hub', () => {
    expect(sourceHref({ type: 'prediction_run', matchId: 'sr:match:5' } as never)).toBe(
      '/predictions/sr:match:5',
    );
    expect(sourceHref({ type: 'prediction_run' } as never)).toBe('/predictions');
  });

  it('puts a psl season in the query string', () => {
    expect(sourceHref({ type: 'psl_standings', id: '2025' } as never)).toBe('/psl?season=2025');
  });

  it('links psl standings with no id to the page itself', () => {
    expect(sourceHref({ type: 'psl_standings' } as never)).toBe('/psl');
  });
});

describe('sourceChipLabel', () => {
  it('labels each source type', () => {
    expect(sourceChipLabel({ type: 'match' } as never)).toBe('Match');
    expect(sourceChipLabel({ type: 'team' } as never)).toBe('Team');
    expect(sourceChipLabel({ type: 'player' } as never)).toBe('Player');
    expect(sourceChipLabel({ type: 'head_to_head' } as never)).toBe('Head to head');
    expect(sourceChipLabel({ type: 'prediction_run' } as never)).toBe('Prediction');
  });

  it('includes a four digit psl season in the label', () => {
    expect(sourceChipLabel({ type: 'psl_standings', id: '2026' } as never)).toBe('PSL 2026');
  });

  it('uses the generic psl label for a non-season id', () => {
    expect(sourceChipLabel({ type: 'psl_standings', id: 'squads' } as never)).toBe('PSL standings');
    expect(sourceChipLabel({ type: 'psl_standings' } as never)).toBe('PSL standings');
  });
});

describe('assistantContextFromLocation', () => {
  it('picks up a match id from /matches', () => {
    const ctx = assistantContextFromLocation('/matches/sr:match:1');
    expect(ctx.slots.matchId).toBe('sr:match:1');
    expect(ctx.starters.length).toBeGreaterThan(0);
  });

  it('uses a prediction-specific intent on a prediction page', () => {
    const ctx = assistantContextFromLocation('/predictions/sr:match:1');
    expect(ctx.slots).toMatchObject({
      matchId: 'sr:match:1',
      intent: 'match_prediction_summary',
    });
  });

  it('picks up a player id and defaults the season to 2026', () => {
    expect(assistantContextFromLocation('/players/sr:player:3').slots).toMatchObject({
      playerId: 'sr:player:3',
      season: '2026',
    });
  });

  it('honours an explicit season from the query', () => {
    expect(assistantContextFromLocation('/players/sr:player:3', '?season=2024').slots.season).toBe('2024');
  });

  it('picks up both team ids for a head-to-head', () => {
    const ctx = assistantContextFromLocation('/teams', '?a=sr:c:1&b=sr:c:2');
    expect(ctx.slots).toMatchObject({ teamAId: 'sr:c:1', teamBId: 'sr:c:2', intent: 'team_head_to_head' });
  });

  it('picks up a single team id', () => {
    expect(assistantContextFromLocation('/teams/sr:c:7').slots).toMatchObject({
      teamId: 'sr:c:7',
      season: '2026',
    });
  });

  it('treats a bare /psl and its sub-pages as psl context', () => {
    expect(assistantContextFromLocation('/psl').slots).toMatchObject({ season: '2026' });
    expect(assistantContextFromLocation('/psl/standings').slots).toMatchObject({ season: '2026' });
  });

  it('returns generic starters on an unrelated page', () => {
    const ctx = assistantContextFromLocation('/news');
    expect(ctx.slots).toEqual({});
    expect(ctx.starters.map((s) => s.label)).toContain('PSL cutoff');
  });

  it('ignores a bare team id with no id segment', () => {
    // "/teams" alone must not be read as an id of "teams".
    expect(assistantContextFromLocation('/teams').slots).toEqual({});
  });
});

describe('localAssistantReply', () => {
  it.each(['hi', 'Hello', 'hey', 'salaam', 'thanks', 'thank you', 'ok', 'bye'])(
    'answers the greeting %s locally without hitting the api',
    (greeting) => {
      expect(localAssistantReply(greeting)).toContain('stored stats');
    },
  );

  it('tolerates trailing punctuation and spaces', () => {
    expect(localAssistantReply('  hi!  ')).toContain('stored stats');
  });

  it('returns null for a real question so the api is used', () => {
    expect(localAssistantReply('Lahore vs Karachi head to head')).toBeNull();
  });

  it('does not treat a question that merely starts with a greeting word as a greeting', () => {
    expect(localAssistantReply('hi there who won')).toBeNull();
  });

  it('returns null for an empty question', () => {
    expect(localAssistantReply('')).toBeNull();
  });
});

describe('normalizeAssistantQuestion', () => {
  it('collapses runs of whitespace', () => {
    expect(normalizeAssistantQuestion('Lahore   vs\n\nKarachi')).toBe('Lahore vs Karachi');
  });

  it('trims the ends', () => {
    expect(normalizeAssistantQuestion('  hello  ')).toBe('hello');
  });

  it('rewrites bs, v/s and verses to vs', () => {
    expect(normalizeAssistantQuestion('Babar bs Rizwan')).toBe('Babar vs Rizwan');
    expect(normalizeAssistantQuestion('Babar v/s Rizwan')).toBe('Babar vs Rizwan');
    expect(normalizeAssistantQuestion('Babar verses Rizwan')).toBe('Babar vs Rizwan');
  });

  it('leaves an existing vs alone', () => {
    expect(normalizeAssistantQuestion('Babar vs. Rizwan')).toBe('Babar vs. Rizwan');
  });
});

describe('assistantRequestSlots', () => {
  it('keeps the match id only when the question is about that match', () => {
    const slots = { matchId: 'sr:match:1' };
    expect(assistantRequestSlots(slots, undefined, 'win probability for this match')).toMatchObject({
      matchId: 'sr:match:1',
    });
    expect(assistantRequestSlots(slots, undefined, 'who won the tournament')).toEqual({});
  });

  it('keeps the player id for a form question', () => {
    expect(assistantRequestSlots({ playerId: 'sr:p:1', season: '2026' }, undefined, 'how has this player done')).toMatchObject({
      playerId: 'sr:p:1',
      season: '2026',
    });
  });

  it('keeps the team id for a cutoff question', () => {
    expect(assistantRequestSlots({ teamId: 'sr:c:1', season: '2026' }, undefined, 'what is the playoff cutoff')).toMatchObject({
      teamId: 'sr:c:1',
      season: '2026',
    });
  });

  it('drops the head-to-head ids when the question names two sides explicitly', () => {
    // The api can resolve "Babar vs Rizwan" itself, so passing stale page ids
    // would point it at the wrong pair.
    const slots = { teamAId: 'sr:c:1', teamBId: 'sr:c:2' };
    expect(assistantRequestSlots(slots, undefined, 'Lahore vs Karachi head to head').teamAId).toBeUndefined();
  });

  it('keeps the head-to-head ids when no two sides are named', () => {
    const slots = { teamAId: 'sr:c:1', teamBId: 'sr:c:2' };
    expect(assistantRequestSlots(slots, undefined, 'head to head')).toMatchObject({
      teamAId: 'sr:c:1',
      teamBId: 'sr:c:2',
    });
  });

  it('never keeps an intent without the ids that back it', () => {
    const out = assistantRequestSlots({ matchId: 'sr:match:1' }, { intent: 'team_head_to_head' }, 'head to head');
    expect(out.intent).toBeUndefined();
  });

  it('keeps standings_qualification even with no ids, since it is global', () => {
    expect(assistantRequestSlots({}, { intent: 'standings_qualification' }, 'cutoff').intent).toBe(
      'standings_qualification',
    );
  });

  it('keeps a match intent only when a match id is present', () => {
    expect(
      assistantRequestSlots({ matchId: 'sr:match:1' }, { intent: 'match_prediction_summary' }, 'this match').intent,
    ).toBe('match_prediction_summary');
    expect(assistantRequestSlots({}, { intent: 'match_prediction_summary' }, 'this match').intent).toBeUndefined();
  });

  it('treats an unknown intent as absent', () => {
    expect(assistantRequestSlots({ matchId: 'm' }, { intent: 'unknown' }, 'this match').intent).toBeUndefined();
  });
});

describe('assistantSessionId', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('creates and stores a uuid on first call', () => {
    const id = assistantSessionId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(window.sessionStorage.getItem('pcz-assistant-session')).toBe(id);
  });

  it('reuses the stored id on later calls', () => {
    const first = assistantSessionId();
    expect(assistantSessionId()).toBe(first);
  });
});

describe('isScopeUnavailable', () => {
  it('is true only for the scope field', () => {
    expect(isScopeUnavailable('scope')).toBe(true);
    expect(isScopeUnavailable('data')).toBe(false);
  });
});
