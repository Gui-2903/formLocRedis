//rodar localmente com docker: docker run -p 6379:6379 -d redis
// lib/redis.js
import { createClient } from 'redis';

let client;

export async function getRedis() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (err) => console.error('Redis Error:', err));
    await client.connect();
  }
  return client;
}
