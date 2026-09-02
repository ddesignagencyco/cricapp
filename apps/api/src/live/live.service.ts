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

/**
 * Bridges Redis pub/sub (events emitted by the ingestion service) into an
 * RxJS stream consumed by SSE clients. Subscribes to match channels (including
 * the currently-live matches, refreshed periodically) and forwards every
 * message onto the shared stream.
 */
@Injectable()
export class LiveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveService.name);
  private readonly updates = new Subject<LiveUpdate>();
  private readonly subscribed = new Set<string>();
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(private readonly redis: RedisService) {}

  onModuleInit() {
    this.redis.subscriber.on('message', (channel, payload) => {
      const matchId = channel.replace(/^match:/, '');
      let parsed: unknown = payload;
      try {
        parsed = JSON.parse(payload);
      } catch {
        // keep raw string payload
      }
      const data = typeof parsed === 'object' && parsed !== null ? parsed : { raw: payload };
      this.updates.next({ type: 'match_update', matchId, data, ts: Date.now() });
    });

    // Subscribe to currently-live matches and refresh regularly so newly
    // started matches are picked up automatically.
    void this.refreshLiveSubscriptions();
    this.refreshTimer = setInterval(() => {
      void this.refreshLiveSubscriptions();
    }, 30000);
  }

  /** Keep a subscription on every currently-live match channel. */
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

  /** Subscribe to a match channel so updates for it reach this process. */
  async subscribeToMatch(matchId: string): Promise<void> {
    if (this.subscribed.has(matchId)) return;
    await this.redis.subscriber.subscribe(`match:${matchId}`);
    this.subscribed.add(matchId);
    this.logger.log(`Subscribed to match:${matchId}`);
  }

  /** Subscribe to every currently-live match channel (used by the global stream). */
  async subscribeToAllLive(): Promise<void> {
    await this.refreshLiveSubscriptions();
  }

  async onModuleDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    await this.redis.subscriber?.unsubscribe();
    this.updates.complete();
  }
}
