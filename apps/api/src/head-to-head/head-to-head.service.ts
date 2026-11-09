import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SportradarService } from '../sportradar/sportradar.service.js';
import { normalizeHeadToHeadPayload, winnerIdFromResultText } from './h2h-payload.util.js';

export interface HeadToHeadResult {
  teamAId: string;
  teamBId: string;
  payload: Record<string, unknown>;
}

function decodeTeamId(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

@Injectable()
export class HeadToHeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sportradar: SportradarService,
  ) {}

  async get(teamAId: string, teamBId: string): Promise<HeadToHeadResult> {
    const [a, b] = [teamAId, teamBId].sort();
    let row = await this.prisma.headToHead.findUnique({
      where: { teamAId_teamBId: { teamAId: a, teamBId: b } },
    });

    if (!row || !this.payloadHasMeetings(row.payload as Record<string, unknown>)) {
      row = (await this.fetchAndPersist(a, b)) ?? row;
    }

    // Providers without a team-versus-team feed (the RapidAPI sources) leave nothing to read,
    // so the meetings are rebuilt from the match records already stored.
    if (!row || !this.payloadHasMeetings(row.payload as Record<string, unknown>)) {
      const derived = await this.deriveFromStoredResults(a, b);
      if (derived) {
        return { teamAId: a, teamBId: b, payload: normalizeHeadToHeadPayload(derived) };
      }
    }

    if (!row) {
      throw new NotFoundException(
        `No head-to-head records found for ${teamAId} vs ${teamBId}`,
      );
    }

    return {
      teamAId: row.teamAId,
      teamBId: row.teamBId,
      payload: normalizeHeadToHeadPayload(row.payload as Record<string, unknown>),
    };
  }

  /**
   * Past and upcoming meetings of two teams, from every stored event that names both as
   * competitors (results, schedules, tournament results). Result records carry the result
   * text, so the winner is read from it, as elsewhere in the app. `null` when they never met
   * in what we hold.
   */
  async deriveFromStoredResults(teamAId: string, teamBId: string): Promise<Record<string, unknown> | null> {
    const both = [JSON.stringify([{ id: teamAId }]), JSON.stringify([{ id: teamBId }])];
    const rows = await this.prisma.$queryRaw<Array<{ payload: Record<string, any> }>>(Prisma.sql`
      SELECT DISTINCT ON (event_id) payload
        FROM sport_event_records
       WHERE kind IN ('team_results', 'tournament_results', 'daily_results', 'team_schedule', 'daily_schedule')
         AND COALESCE(payload->'sport_event', payload)->'competitors' @> ${both[0]}::jsonb
         AND COALESCE(payload->'sport_event', payload)->'competitors' @> ${both[1]}::jsonb
       ORDER BY event_id, (payload ? 'sport_event_status') DESC, scheduled DESC NULLS LAST
    `);

    const last: Array<Record<string, unknown>> = [];
    const next: Array<Record<string, unknown>> = [];
    let competitors: unknown[] = [];
    const now = Date.now();

    for (const { payload } of rows) {
      const event = (payload.sport_event ?? payload) as Record<string, any>;
      const block = (payload.sport_event_status ?? {}) as Record<string, any>;
      const comps = (event.competitors ?? []) as Array<Record<string, unknown>>;
      if (!competitors.length) competitors = comps.filter((c) => c.id === teamAId || c.id === teamBId);

      const status = String(block.status ?? event.status ?? '');
      if (status === 'closed') {
        const text = block.match_result_text ?? (typeof event.match_status === 'string' ? event.match_status : undefined);
        last.push({
          sport_event: event,
          sport_event_status: {
            status: 'closed',
            match_result_text: text,
            winner_id: block.winner_id ?? winnerIdFromResultText(text, comps),
            display_score: block.display_score,
          },
        });
      } else if (status !== 'cancelled' && event.scheduled && Date.parse(String(event.scheduled)) >= now) {
        next.push(event);
      }
    }

    if (!last.length && !next.length) return null;
    const when = (e: Record<string, any>) => Date.parse(String((e.sport_event ?? e).scheduled ?? '')) || 0;
    last.sort((x, y) => when(y) - when(x));
    next.sort((x, y) => when(x) - when(y));
    return { competitors, last_meetings: last.slice(0, 30), next_meetings: next.slice(0, 10), derived: true };
  }

  private payloadHasMeetings(payload: Record<string, unknown>): boolean {
    const normalized = normalizeHeadToHeadPayload(payload);
    const last = normalized.last_meetings;
    const next = normalized.next_meetings;
    return (
      (Array.isArray(last) && last.length > 0) ||
      (Array.isArray(next) && next.length > 0)
    );
  }

  private async fetchAndPersist(teamAId: string, teamBId: string) {
    if (!this.sportradar.isConfigured) return null;
    try {
      const raw = await this.sportradar.fetchTeamVersusTeam(teamAId, teamBId);
      const payload = normalizeHeadToHeadPayload(raw);
      return await this.prisma.headToHead.upsert({
        where: { teamAId_teamBId: { teamAId, teamBId } },
        create: {
          teamAId,
          teamBId,
          payload: payload as Prisma.InputJsonValue,
        },
        update: {
          payload: payload as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      if (err instanceof ServiceUnavailableException) return null;
      throw err;
    }
  }
}
