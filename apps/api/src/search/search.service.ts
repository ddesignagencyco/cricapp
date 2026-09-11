import { Injectable } from '@nestjs/common';
import { PlayersService } from '../players/players.service.js';
import { TeamsService } from '../teams/teams.service.js';
import { MatchesService } from '../matches/matches.service.js';
import { TournamentsService } from '../tournaments/tournaments.service.js';
import type { UnifiedSearchQuery } from './dto/search.dto.js';

@Injectable()
export class SearchService {
  constructor(
    private readonly players: PlayersService,
    private readonly teams: TeamsService,
    private readonly matches: MatchesService,
    private readonly tournaments: TournamentsService,
  ) {}

  async searchAll(query: UnifiedSearchQuery) {
    const q = query.q.trim();
    if (!q) {
      return { players: [], teams: [], matches: [], tournaments: [] };
    }

    const [playerRes, teamRes, matchRes, tournamentRes] = await Promise.all([
      this.players.search({ q, page: 1, limit: query.playerLimit ?? 6 }),
      this.teams.search({ q, page: 1, limit: query.teamLimit ?? 6 }),
      this.matches.search({ q, page: 1, limit: query.matchLimit ?? 6 }),
      this.tournaments.search({ q, page: 1, limit: query.tournamentLimit ?? 4 }),
    ]);

    return {
      players: playerRes.data,
      teams: teamRes.data,
      matches: matchRes.data,
      tournaments: tournamentRes.data,
    };
  }
}
