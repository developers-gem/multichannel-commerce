// import Redis from 'ioredis';

// const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// export const redis = new Redis(redisUrl, {
//   maxRetriesPerRequest: null, // Required by BullMQ
// });

// redis.on('connect', () => {
//   console.log('Connected to Redis/Valkey successfully');
// });

// redis.on('error', (err) => {
//   console.error('Redis connection error:', err);
// });

// backend/src/config/redis.ts
import Redis from 'ioredis';
import { Queue } from 'bullmq';

const rawHost = process.env.REDIS_HOST || 'localhost';
const hostUrl = rawHost.startsWith('redis://') || rawHost.startsWith('rediss://')
  ? rawHost
  : `redis://${rawHost}:${process.env.REDIS_PORT || 6379}`;

const redisUrl = process.env.REDIS_URL || hostUrl;

// Shared ioredis client
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableOfflineQueue: false,
  retryStrategy: () => null, // Stop reconnecting continuously if offline in test/dev
});
  
redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis/Valkey successfully');
});





redisConnection.on('error', (err) => {
  // Silent warning if Redis is offline during local test/dev
});

// Initialize BullMQ Queue for background syncs
export const productSyncQueue = new Queue('product-sync', {
  connection: redisConnection,
});