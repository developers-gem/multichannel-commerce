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

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

// Shared ioredis client
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
});

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis/Valkey successfully');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err);
});

// Initialize BullMQ Queue for background syncs
export const productSyncQueue = new Queue('product-sync', {
  connection: redisConnection,
});