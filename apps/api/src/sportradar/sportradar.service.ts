import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_BASE_URL = 'https://api.sportradar.com';
const ACCESS_LEVEL = 't';
const LANG = 'en';
const REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class SportradarService {
  private readonly logger = new Logger(SportradarService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('SPORTRADAR_API_BASE_URL') ?? DEFAULT_BASE_URL;
    this.apiKey = this.config.get<string>('SPORTRADAR_API_KEY');
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey?.trim());
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Sportradar API is not configured (set SPORTRADAR_API_KEY on the API service).',
      );
    }
  }

  /**
   * `notFoundAs404` turns an upstream 404 (unknown resource id) into NotFoundException;
   * otherwise every non-2xx is treated as an upstream outage (503).
   */
  private async fetchJson(
    path: string,
    { notFoundAs404 = false }: { notFoundAs404?: boolean } = {},
  ): Promise<Record<string, unknown>> {
    this.assertConfigured();
    const url = `${this.baseUrl}/cricket-${ACCESS_LEVEL}2/${LANG}/${path}`;
    const params = new URLSearchParams({ api_key: this.apiKey!.trim() });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${url}?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) {
        this.logger.warn(`Sportradar ${res.status} for ${path}`);
        if (res.status === 404 && notFoundAs404) {
          throw new NotFoundException('Sportradar resource not found.');
        }
        throw new ServiceUnavailableException(`Sportradar request failed (${res.status}).`);
      }
      return (await res.json()) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Sportradar fetch failed for ${path}: ${message}`);
      throw new ServiceUnavailableException('Sportradar request failed.');
    } finally {
      clearTimeout(timer);
    }
  }

  fetchTeamVersusTeam(teamId: string, teamId2: string): Promise<Record<string, unknown>> {
    return this.fetchJson(`teams/${teamId}/versus/${teamId2}/matches.json`);
  }

  fetchMatchTimeline(matchId: string): Promise<Record<string, unknown>> {
    return this.fetchJson(`matches/${matchId}/timeline.json`, { notFoundAs404: true });
  }
}
