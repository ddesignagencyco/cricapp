import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drainProfileQueue } from '../src/profileQueue.js';

/** Just enough of ioredis for the queue. */
function fakeRedis(ids = []) {
  const kv = new Map();
  const queue = [...ids];
  return {
    kv,
    queue,
    get: async (k) => kv.get(k) ?? null,
    set: async (k, v) => void kv.set(k, v),
    incr: async (k) => { kv.set(k, String(Number(kv.get(k) ?? 0) + 1)); },
    expire: async () => {},
    zpopmin: async () => (queue.length ? [queue.shift(), '1'] : []),
  };
}

test('drains up to perTick players, marks each with a backoff and counts them', async () => {
  const client = fakeRedis(['cb:player:1', 'cb:player:2', 'cb:player:3']);
  const seen = [];
  const r = await drainProfileQueue({ perTick: 2, dailyCap: 10, client, sync: async (id) => void seen.push(id) });
  assert.deepEqual(seen, ['cb:player:1', 'cb:player:2']);
  assert.deepEqual(r, { synced: 2, failed: 0, capped: false });
  assert.ok(client.kv.has('profile:backoff:cb:player:1'));
  assert.equal(client.queue.length, 1);
});

test('a failing sync is counted, backed off, and does not stop the rest', async () => {
  const client = fakeRedis(['cb:player:1', 'cb:player:2']);
  const r = await drainProfileQueue({
    perTick: 2, dailyCap: 10, client,
    sync: async (id) => { if (id.endsWith(':1')) throw new Error('no data'); },
  });
  assert.deepEqual(r, { synced: 1, failed: 1, capped: false });
  assert.ok(client.kv.has('profile:backoff:cb:player:1'));
});

test('stops at the daily cap', async () => {
  const client = fakeRedis(['cb:player:1']);
  const today = new Date().toISOString().slice(0, 10);
  client.kv.set(`profile:ondemand:${today}`, '5');
  const r = await drainProfileQueue({ perTick: 2, dailyCap: 5, client, sync: async () => assert.fail('must not sync') });
  assert.equal(r.capped, true);
  assert.equal(client.queue.length, 1);
});
