import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsHistoryController } from './notifications-history.controller.js';
import { NotificationsService } from './notifications.service.js';
import { MatchEventBridgeService } from './match-event-bridge.service.js';
import { FcmProvider } from './fcm.provider.js';
import { LiveModule } from '../live/live.module.js';

@Module({
  imports: [LiveModule],
  controllers: [NotificationsController, NotificationsHistoryController],
  providers: [NotificationsService, MatchEventBridgeService, FcmProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
