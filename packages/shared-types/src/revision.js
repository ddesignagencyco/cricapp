/**
 * Monotonic per-match revision helpers.
 *
 * A timeline payload advances once per ball, so the revision is derived from
 * the payload itself: the highest event sequence number, falling back to the
 * number of events when the provider stops sending sequences. Because it is a
 * pure function of the stored payload it is identical no matter which service
 * computes it (ingestion on write, API on read).
 */

/** Locate the timeline event array across all accepted payload shapes. */
export function timelineEntriesOf(payload) {
  if (!payload || typeof payload !== "object") return null;
  const wrapper = payload.sport_event_timeline;
  const nested = wrapper && typeof wrapper === "object" ? wrapper.timeline : null;
  const event = payload.sport_event;
  const arr = Array.isArray(payload.timeline)
    ? payload.timeline
    : Array.isArray(nested)
      ? nested
      : Array.isArray(event?.timeline)
        ? event.timeline
        : null;
  return arr;
}

function numericId(entry) {
  if (!entry || typeof entry !== "object") return null;
  const candidates = [entry.sequence, entry.event_num, entry.id, entry.event_id];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string" && c.trim() !== "" && !Number.isNaN(Number(c))) {
      return Number(c);
    }
  }
  return null;
}

/**
 * Monotonic revision for a timeline payload: the max event sequence, or the
 * event count when no event carries a numeric sequence. Null when the payload
 * carries no events.
 */
export function timelineRevision(payload) {
  const entries = timelineEntriesOf(payload);
  if (!entries || entries.length === 0) return null;
  let max = null;
  for (const entry of entries) {
    const id = numericId(entry);
    if (id != null) max = max == null ? id : Math.max(max, id);
  }
  return max ?? entries.length;
}

/** Events after a given revision (events whose numeric sequence > since). */
export function timelineEventsSince(payload, since) {
  const entries = timelineEntriesOf(payload);
  if (!entries) return [];
  if (since == null || !Number.isFinite(since)) return entries;
  const withIds = entries.filter((e) => numericId(e) != null);
  if (withIds.length > 0) {
    return entries.filter((e) => {
      const id = numericId(e);
      return id != null && id > since;
    });
  }
  // No numeric ids anywhere: fall back to slicing by position.
  return entries.slice(Math.max(0, Math.min(entries.length, since)));
}

/**
 * Patch every `sport_event_status` block the payload carries (top-level and
 * wrapped in `sport_event_timeline`) with the running totals from the last
 * timeline event that carried them, so the status block cannot lag its own
 * ball events.
 */
export function reconcileTimelineStatus(payload) {
  const entries = timelineEntriesOf(payload);
  if (!entries || entries.length === 0) return payload;
  let last = null;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const e = entries[i];
    if (e && typeof e === 'object' && (e.display_score != null || e.display_overs != null)) {
      last = e;
      break;
    }
  }
  if (!last) return payload;
  const copy = { ...payload };
  const patch = {};
  if (last.display_score != null) patch.display_score = last.display_score;
  if (last.display_overs != null) patch.display_overs = last.display_overs;

  if (copy.sport_event_status && typeof copy.sport_event_status === 'object') {
    copy.sport_event_status = { ...copy.sport_event_status, ...patch };
  }
  const wrapper = copy.sport_event_timeline;
  if (wrapper && typeof wrapper === 'object') {
    const inner = wrapper.sport_event_status;
    copy.sport_event_timeline = {
      ...wrapper,
      sport_event_status:
        inner && typeof inner === 'object' ? { ...inner, ...patch } : patch,
    };
  }
  return copy;
}

/** True when every event carries a numeric sequence (so since-filtering is exact). */
export function timelineIsSequenced(payload) {
  const entries = timelineEntriesOf(payload);
  if (!entries || entries.length === 0) return false;
  return entries.every((e) => numericId(e) != null);
}
