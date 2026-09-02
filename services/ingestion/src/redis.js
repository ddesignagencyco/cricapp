import Redis from 'ioredis';
export { redisKeys, REDIS_TTL } from '@cricapp/shared-types';

const client = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;
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
