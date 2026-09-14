import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { io, type Socket } from 'socket.io-client';
import {
  setupTestApp,
  teardownTestApp,
  type TestContext,
} from '../common/test-setup.js';

describe('LiveGateway (integration)', () => {
  let ctx: TestContext;
  let socket: Socket;

  beforeAll(async () => {
    ctx = await setupTestApp();
    await ctx.app.listen(0, '127.0.0.1');
    const address = ctx.app.getHttpServer().address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not expose a TCP port');
    }
    socket = io(`http://127.0.0.1:${address.port}/matches`, {
      transports: ['websocket'],
      forceNew: true,
    });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Socket connection timed out')),
        5000,
      );
      socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.once('connect_error', reject);
    });
  });

  afterAll(async () => {
    socket?.disconnect();
    await teardownTestApp(ctx);
  });

  it('connects on /matches and supports match rooms', async () => {
    const response = await socket
      .timeout(3000)
      .emitWithAck('subscribe:match', { matchId: 'sr:match:123' });
    expect(response).toEqual({ ok: true, matchId: 'sr:match:123' });
  });

  it('rejects an empty match subscription', async () => {
    const response = await socket
      .timeout(3000)
      .emitWithAck('subscribe:match', { matchId: '' });
    expect(response.ok).toBe(false);
  });
});
