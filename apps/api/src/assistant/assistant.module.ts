import { Module } from '@nestjs/common';
import { HeadToHeadModule } from '../head-to-head/head-to-head.module.js';
import { PredictionsModule } from '../predictions/predictions.module.js';
import { TeamsModule } from '../teams/teams.module.js';
import { PlayersModule } from '../players/players.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantNarrativeService } from './assistant-narrative.service.js';
import { AssistantQueryService } from './assistant-query.service.js';
import { AssistantService } from './assistant.service.js';

@Module({
  imports: [HeadToHeadModule, PredictionsModule, TeamsModule, PlayersModule],
  controllers: [AssistantController],
  providers: [AssistantService, AssistantQueryService, AssistantNarrativeService],
})
export class AssistantModule {}
