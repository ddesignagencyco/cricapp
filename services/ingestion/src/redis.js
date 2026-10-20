import Redis from 'ioredis';
export { redisKeys, REDIS_TTL } from '@cricapp/shared-types';

const client = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  // Keep reconnecting. Returning null after 10 tries made ioredis give up for good, so a
  // Redis restart longer than ~a minute left the worker running but writing nothing.
  retryStrategy(times) {
    return Math.min(times * 200, 5000);
  },
});

client.on('error', (err) => {
  console.error('redis connection error', err);
});

export async function shutdown() {
  await client.quit();
}

export default client;
