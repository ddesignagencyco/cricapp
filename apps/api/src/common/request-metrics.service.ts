import { Injectable } from '@nestjs/common';

export interface RequestMetricsSnapshot {
  total: number;
  errors: number;
  avgMs: number;
  maxMs: number;
  startedAt: string;
  byClass: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
}

/**
 * In-memory counters for the public landing page.
 *
 * These are process-lifetime numbers, not persisted history: every restart or
 * deploy starts from zero. The page labels them accordingly so nobody mistakes
 * them for long-term analytics (those live in `/api/admin/analytics`).
 */
@Injectable()
export class RequestMetricsService {
  private readonly startedAt = Date.now();
  private total = 0;
  private errors = 0;
  private totalMs = 0;
  private maxMs = 0;
  private readonly byClass: RequestMetricsSnapshot['byClass'] = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  };

  record(statusCode: number, durationMs: number): void {
    this.total += 1;
    this.totalMs += durationMs;
    if (durationMs > this.maxMs) this.maxMs = durationMs;
    if (statusCode >= 500) this.errors += 1;

    if (statusCode >= 500) this.byClass['5xx'] += 1;
    else if (statusCode >= 400) this.byClass['4xx'] += 1;
    else if (statusCode >= 300) this.byClass['3xx'] += 1;
    else this.byClass['2xx'] += 1;
  }

  snapshot(): RequestMetricsSnapshot {
    return {
      total: this.total,
      errors: this.errors,
      avgMs: this.total === 0 ? 0 : Math.round(this.totalMs / this.total),
      maxMs: this.maxMs,
      startedAt: new Date(this.startedAt).toISOString(),
      byClass: { ...this.byClass },
    };
  }
}
