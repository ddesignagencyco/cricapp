import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { RedisService } from '../redis/redis.service.js';
import { redisKeys } from '@cricapp/shared-types';

export interface LiveUpdate {
  type: string;
  matchId: string;
  data?: unknown;
  ts: number;
}

const MATCH_CHANNEL_PATTERN = 'match:*';

/**
 * Bridges Redis pub/sub (ingestion PUBLISH on match:{id}) into Socket.IO.
 * Pattern-subscribes so newly live matches are received immediately.
 */
@Injectable()
export class LiveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveService.name);
  private readonly updates = new Subject<LiveUpdate>();
  private readonly subscribed = new Set<string>();
  private patternSubscribed = false;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(private readonly redis: RedisService) {}

  onModuleInit() {
    this.redis.subscriber.on('pmessage', (_pattern: string, channel: string, payload: string) => {
      this.forward(channel, payload);
    });
    this.redis.subscriber.on('message', (channel: string, payload: string) => {
      this.forward(channel, payload);
    });

    void this.redis.subscriber
      .psubscribe(MATCH_CHANNEL_PATTERN)
      .then(() => {
        this.patternSubscribed = true;
        this.logger.log(`Listening on Redis pattern ${MATCH_CHANNEL_PATTERN}`);
      })
      .catch((err: Error) => {
        this.logger.warn(
          `psubscribe failed, falling back to live-set polling: ${err.message}`,
        );
        void this.refreshLiveSubscriptions();
        this.refreshTimer = setInterval(() => {
          void this.refreshLiveSubscriptions();
        }, 5000);
      });
  }

  private forward(channel: string, payload: string): void {
    let parsed: unknown = payload;
    try {
      parsed = JSON.parse(payload);
    } catch {
      // keep raw string payload
    }
    const data =
      typeof parsed === 'object' && parsed !== null ? parsed : { raw: payload };
    const fromPayload =
      typeof data === 'object' &&
      data !== null &&
      'matchId' in data &&
      typeof (data as { matchId?: unknown }).matchId === 'string'
        ? (data as { matchId: string }).matchId
        : '';
    const matchId = fromPayload || channel.replace(/^match:/, '');
    this.updates.next({ type: 'match_update', matchId, data, ts: Date.now() });
  }

  private async refreshLiveSubscriptions(): Promise<void> {
    let liveIds: string[] = [];
    try {
      liveIds = await this.redis.smembers(redisKeys.liveMatches());
    } catch (err) {
      this.logger.warn(`Failed to read live match set: ${(err as Error).message}`);
      return;
    }
    for (const id of liveIds) {
      await this.subscribeToMatch(id).catch((e: Error) => {
        this.logger.warn(`Failed to subscribe to ${id}: ${e.message}`);
      });
    }
  }

  stream() {
    return this.updates.asObservable();
  }

  async subscribeToMatch(matchId: string): Promise<void> {
    if (this.subscribed.has(matchId)) return;
    if (!this.patternSubscribed) {
      await this.redis.subscriber.subscribe(redisKeys.matchChannel(matchId));
    }
    this.subscribed.add(matchId);
    this.logger.log(`Subscribed to ${redisKeys.matchChannel(matchId)}`);
  }

  async subscribeToAllLive(): Promise<void> {
    await this.refreshLiveSubscriptions();
  }

  async onModuleDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.patternSubscribed) {
      await this.redis.subscriber?.punsubscribe(MATCH_CHANNEL_PATTERN);
    }
    await this.redis.subscriber?.unsubscribe();
    this.updates.complete();
  }
}
