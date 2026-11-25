import { Injectable, Logger } from '@nestjs/common';
import { PlayersService } from '../players/players.service.js';
import { TeamsService } from '../teams/teams.service.js';
import { MatchesService } from '../matches/matches.service.js';
import { TournamentsService } from '../tournaments/tournaments.service.js';
import { NewsService } from '../news/news.service.js';
import type { UnifiedSearchQuery } from './dto/search.dto.js';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly players: PlayersService,
    private readonly teams: TeamsService,
    private readonly matches: MatchesService,
    private readonly tournaments: TournamentsService,
    private readonly news: NewsService,
  ) {}

  async searchAll(query: UnifiedSearchQuery) {
    const q = query.q.trim();
    if (!q) {
      return { players: [], teams: [], matches: [], tournaments: [], news: [] };
    }

    const [playerRes, teamRes, matchRes, tournamentRes, newsRes] = await Promise.allSettled([
      this.players.search({ q, page: 1, limit: query.playerLimit ?? 6 }),
      this.teams.search({ q, page: 1, limit: query.teamLimit ?? 6 }),
      this.matches.search({ q, page: 1, limit: query.matchLimit ?? 6 }),
      this.tournaments.search({ q, page: 1, limit: query.tournamentLimit ?? 4 }),
      this.news.list({ q, page: 1, limit: query.newsLimit ?? 6 }),
    ]);

    const extract = <T>(name: string, res: PromiseSettledResult<{ data: T[] }>): T[] => {
      if (res.status === 'fulfilled') return res.value.data;
      this.logger.warn(`Search sub-query "${name}" failed: ${res.reason?.message ?? res.reason}`);
      return [];
    };

    return {
      players: extract('players', playerRes),
      teams: extract('teams', teamRes),
      matches: extract('matches', matchRes),
      tournaments: extract('tournaments', tournamentRes),
      news: extract('news', newsRes),
    };
  }
}
