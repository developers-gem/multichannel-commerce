// backend/src/config/redis.ts
import Redis from "ioredis";
import { Queue } from "bullmq";
import { redisLogTarget, resolveRedisUrl } from "./redis-url";

const redisUrl = resolveRedisUrl();

if (!redisUrl) {
  console.error("Redis unavailable: REDIS_URL or REDIS_HOST is not configured");
}

// Shared ioredis client for locks and OAuth state. Sync jobs use sync.queue.ts.
export const redisConnection = new Redis(redisUrl || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: !redisUrl,
  retryStrategy: () => null,
});

redisConnection.on("connect", () => {
  console.log(`Redis connected (${redisLogTarget(redisUrl || "redis://127.0.0.1:6379")})`);
});

redisConnection.on("error", (err) => {
  console.error(`Redis unavailable: ${err.message}`);
});

export const productSyncQueue = new Queue("product-sync", {
  connection: redisConnection,
});
