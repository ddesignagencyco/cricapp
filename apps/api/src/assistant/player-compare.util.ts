export interface PslLeaderStatRow {
  category: string;
  stat: string;
  rank: number;
  value: number;
}

export interface PlayerCompareStatDiff {
  category: string;
  stat: string;
  playerAValue: number;
  playerBValue: number;
  playerARank: number;
  playerBRank: number;
  leader: 'a' | 'b' | 'tie';
}

export interface PlayerCompareVerified {
  seasonId: string;
  seasonName: string;
  playerA: { id: string; name: string };
  playerB: { id: string; name: string };
  comparisons: PlayerCompareStatDiff[];
}

export function buildPlayerCompareVerified(input: {
  seasonId: string;
  seasonName: string;
  playerA: { id: string; name: string };
  playerB: { id: string; name: string };
  rowsA: PslLeaderStatRow[];
  rowsB: PslLeaderStatRow[];
}): PlayerCompareVerified {
  const mapA = new Map(input.rowsA.map((r) => [`${r.category}:${r.stat}`, r]));
  const mapB = new Map(input.rowsB.map((r) => [`${r.category}:${r.stat}`, r]));
  const keys = new Set([...mapA.keys(), ...mapB.keys()]);
  const comparisons: PlayerCompareStatDiff[] = [];

  for (const key of [...keys].sort()) {
    const a = mapA.get(key);
    const b = mapB.get(key);
    if (!a || !b) continue;
    const [category, stat] = key.split(':');
    let leader: 'a' | 'b' | 'tie' = 'tie';
    if (a.value > b.value) leader = 'a';
    else if (b.value > a.value) leader = 'b';
    comparisons.push({
      category: category!,
      stat: stat!,
      playerAValue: a.value,
      playerBValue: b.value,
      playerARank: a.rank,
      playerBRank: b.rank,
      leader,
    });
  }

  return {
    seasonId: input.seasonId,
    seasonName: input.seasonName,
    playerA: input.playerA,
    playerB: input.playerB,
    comparisons,
  };
}
