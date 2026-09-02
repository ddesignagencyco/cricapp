import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private pubSubClient!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.client = new Redis(url, { lazyConnect: true });
    this.pubSubClient = new Redis(url, { lazyConnect: true });
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.client?.quit(), this.pubSubClient?.quit()]);
  }

  get cached() {
    return this.client;
  }

  get subscriber() {
    return this.pubSubClient;
  }

  /** Fetch a cached JSON value, or null when absent. */
  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }
}
