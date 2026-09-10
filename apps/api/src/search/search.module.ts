import { Module } from '@nestjs/common';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { PlayersModule } from '../players/players.module.js';
import { TeamsModule } from '../teams/teams.module.js';
import { MatchesModule } from '../matches/matches.module.js';
import { TournamentsModule } from '../tournaments/tournaments.module.js';

@Module({
  imports: [PlayersModule, TeamsModule, MatchesModule, TournamentsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
