import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { EVENT_TYPES, MATCH_STATUS } from '@cricapp/shared-types';
import { LiveService, type LiveUpdate } from '../live/live.service.js';
import { NotificationsService } from './notifications.service.js';

interface MatchEventPayload {
  type?: string;
  matchId?: string;
}

@Injectable()
export class MatchEventBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchEventBridgeService.name);
  private subscription?: Subscription;

  constructor(
    private readonly live: LiveService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.subscription = this.live.stream().subscribe((update) => {
      void this.handleUpdate(update);
    });
    this.logger.log('Listening for live match events to trigger push notifications');
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }

  private async handleUpdate(update: LiveUpdate) {
    const payload = (typeof update.data === 'object' && update.data !== null
      ? update.data
      : {}) as MatchEventPayload;
    const eventType = payload.type;
    const matchId = payload.matchId ?? update.matchId;
    if (!eventType || !matchId) return;

    try {
      switch (eventType) {
        case EVENT_TYPES.MATCH_STARTED:
          await this.notifications.notifyMatchStart(matchId);
          break;
        case EVENT_TYPES.WICKET:
          await this.notifications.notifyWicket(matchId, 'A wicket has fallen');
          break;
        case EVENT_TYPES.MILESTONE:
          await this.notifications.notifyMilestone(matchId, 'A batting milestone reached');
          break;
        case EVENT_TYPES.STATUS_CHANGE:
          await this.notifications.notifyMatchEndIfCompleted(matchId);
          break;
        default:
          break;
      }
    } catch (err) {
      this.logger.warn(`Notification dispatch failed for ${matchId}: ${(err as Error).message}`);
    }
  }
}
