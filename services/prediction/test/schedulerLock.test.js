import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PREDICTION_WORKER_LOCK_KEY, workerIsActive } from '../src/schedulerLock.js';

describe('workerIsActive', () => {
  it('probes the worker lock in a single statement with the shared key', async () => {
    const calls = [];
    const query = async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [{ active: true }] };
    };
    assert.equal(await workerIsActive(query), true);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].params, [PREDICTION_WORKER_LOCK_KEY]);
    assert.match(calls[0].sql, /pg_try_advisory_lock\(\$1\)/);
  });

  it('reports inactive when the probe could take the lock', async () => {
    assert.equal(await workerIsActive(async () => ({ rows: [{ active: false }] })), false);
  });
});
