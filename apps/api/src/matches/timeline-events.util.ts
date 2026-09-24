type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function timelineEventId(entry: unknown): string | number | null {
  const e = asRecord(entry);
  if (!e) return null;
  for (const key of ['id', 'event_id', 'uuid', 'sequence']) {
    const v = e[key];
    if (v !== undefined && v !== null && (typeof v === 'string' || typeof v === 'number')) {
      return v;
    }
  }
  return null;
}

function timelineEntries(payload: UnknownRecord): unknown[] | null {
  const wrapper = asRecord(payload.sport_event_timeline);
  const nested = wrapper?.timeline;
  const event = asRecord(payload.sport_event);
  const arr = Array.isArray(payload.timeline)
    ? payload.timeline
    : Array.isArray(nested)
      ? nested
      : Array.isArray(event?.timeline)
        ? event.timeline
        : null;
  return arr;
}

/**
 * Dedupe ball-by-ball timeline entries by a stable event identifier
 * (id / sequence), keeping the earliest occurrence so ordering stays intact.
 * Any non-timeline fields of the payload pass through untouched.
 */
export function dedupeTimelineEvents(raw: UnknownRecord): UnknownRecord {
  if (!raw) return raw;
  const entries = timelineEntries(raw);
  if (!entries || entries.length === 0) return raw;

  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const entry of entries) {
    const id = timelineEventId(entry);
    if (id != null) {
      if (seen.has(String(id))) continue;
      seen.add(String(id));
    }
    out.push(entry);
  }
  if (out.length === entries.length) return raw;

  const copy: UnknownRecord = { ...raw };
  const wrapper = asRecord(raw.sport_event_timeline);
  const event = asRecord(raw.sport_event);
  if (Array.isArray(raw.timeline)) {
    copy.timeline = out;
  } else if (wrapper && Array.isArray(wrapper.timeline)) {
    copy.sport_event_timeline = { ...wrapper, timeline: out };
  } else if (event && Array.isArray(event.timeline)) {
    copy.sport_event = { ...event, timeline: out };
  }
  return copy;
}