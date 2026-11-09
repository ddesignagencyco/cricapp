import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickLiveIds } from '../src/liveSelection.js';

const IN_PLAY = new Set(['live', 'interrupted', 'suspended']);
const events = [
  { id: 'a', status: 'interrupted' },
  { id: 'b', status: 'closed' },
  { id: 'c', status: 'live' },
  { id: 'd', status: 'not_started' },
  { id: 'e', status: 'suspended' },
  { id: 'f', status: 'live' },
];

describe('pickLiveIds', () => {
  it('follows every in-play match, in provider order, when uncapped', () => {
    assert.deepEqual(pickLiveIds(events, IN_PLAY, 0), ['a', 'c', 'e', 'f']);
    assert.deepEqual(pickLiveIds(events, IN_PLAY), ['a', 'c', 'e', 'f']);
  });

  it('when capped, prefers matches being played over paused ones', () => {
    assert.deepEqual(pickLiveIds(events, IN_PLAY, 2), ['c', 'f']);
    assert.deepEqual(pickLiveIds(events, IN_PLAY, 3), ['c', 'f', 'a']);
  });

  it('a cap larger than the in-play set changes nothing but order', () => {
    assert.equal(pickLiveIds(events, IN_PLAY, 10).length, 4);
  });

  it('never returns finished or upcoming matches', () => {
    assert.ok(!pickLiveIds(events, IN_PLAY, 10).includes('b'));
    assert.deepEqual(pickLiveIds([], IN_PLAY, 5), []);
  });
});
