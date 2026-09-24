import { dedupeTimelineEvents } from './timeline-events.util.js';

describe('dedupeTimelineEvents', () => {
  it('keeps the payload untouched when there are no duplicate event ids', () => {
    const payload = {
      sport_event_timeline: {
        timeline: [
          { id: 'e1', sequence: 1, type: 'ball' },
          { id: 'e2', sequence: 2, type: 'ball' },
        ],
      },
    };
    const out = dedupeTimelineEvents(payload);
    expect(out).toBe(payload);
  });

  it('drops duplicate timeline entries by stable event id', () => {
    const payload = {
      sport_event_timeline: {
        sport_event_status: { status: 'live' },
        timeline: [
          { id: 'e1', sequence: 1 },
          { id: 'e2', sequence: 2 },
          { id: 'e1', sequence: 1 },
          { id: 'e3', sequence: 3 },
        ],
      },
    };
    const out = dedupeTimelineEvents(payload);
    const timeline = (out.sport_event_timeline as { timeline: Array<{ id: string }> }).timeline;
    expect(timeline.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect(
      (out.sport_event_timeline as { sport_event_status: { status: string } }).sport_event_status
        .status,
    ).toBe('live');
  });

  it('falls back to sequence when no id is present', () => {
    const payload = {
      timeline: [
        { sequence: 10, type: 'wicket' },
        { sequence: 11, type: 'ball' },
        { sequence: 10, type: 'wicket' },
      ],
    };
    const out = dedupeTimelineEvents(payload);
    expect(out.timeline).toHaveLength(2);
  });

  it('keeps unkeyable entries and dedupes only identified ones', () => {
    const payload = {
      sport_event: {
        timeline: [
          { type: 'noop' },
          { id: 'a', type: 'ball' },
          { id: 'a', type: 'ball' },
          { type: 'noop' },
        ],
      },
    };
    const out = dedupeTimelineEvents(payload);
    const timeline = (out.sport_event as { timeline: Array<Record<string, unknown>> }).timeline;
    expect(timeline).toHaveLength(3);
  });

  it('returns payloads with no timeline array untouched', () => {
    const payload = { sport_event_timeline: { sport_event_status: { status: 'ended' } } };
    expect(dedupeTimelineEvents(payload)).toBe(payload);
  });
});