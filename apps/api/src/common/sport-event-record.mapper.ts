import {
  sportEventFromPayload,
  sportEventStatusFromPayload,
  type SportEventStatusView,
} from './sport-event-status.util.js';

export interface EnrichedSportEventRecord {
  kind: string;
  scopeKey: string;
  eventId: string;
  status: string | null;
  scheduled: string | null;
  payload: Record<string, unknown>;
  sportEvent?: Record<string, unknown>;
  sportEventStatus?: SportEventStatusView;
}

export function mapEnrichedSportEventRecord(row: {
  kind: string;
  scopeKey: string;
  eventId: string;
  status: string | null;
  scheduled: string | null;
  payload: unknown;
}): EnrichedSportEventRecord {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const sportEvent = sportEventFromPayload(payload);
  const sportEventStatus = sportEventStatusFromPayload(payload);
  return {
    kind: row.kind,
    scopeKey: row.scopeKey,
    eventId: row.eventId,
    status: row.status,
    scheduled: row.scheduled,
    payload,
    ...(sportEvent ? { sportEvent } : {}),
    ...(sportEventStatus ? { sportEventStatus } : {}),
  };
}
