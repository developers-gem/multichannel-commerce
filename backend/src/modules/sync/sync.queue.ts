// import { Queue } from "bullmq";
// import Redis from "ioredis";
// import { env } from "../../config/env";
// import { ISyncJobPayload } from "./sync.types";

// export const QUEUE_NAME = "product-sync-queue";

// export const redisConnection = new Redis({
//   host: env.REDIS_HOST,
//   port: env.REDIS_PORT,
//   password: env.REDIS_PASSWORD || undefined,
//   db: env.REDIS_DB,
//   maxRetriesPerRequest: null, // Required by BullMQ
//   enableReadyCheck: false,
//   lazyConnect: false,
// });

// redisConnection.on("error", (err) => {
//   // Prevent uncaught connection exception when local Redis server is offline
// });

// export const productSyncQueue = new Queue<ISyncJobPayload>(QUEUE_NAME, {
//   connection: redisConnection,
//   defaultJobOptions: {
//     attempts: env.SYNC_MAX_RETRIES || 3,
//     backoff: {
//       type: "exponential",
//       delay: 5000,
//     },
//     removeOnComplete: {
//       age: 86400, // Retention: 24 hours in Redis
//       count: 1000,
//     },
//     removeOnFail: {
//       age: 604800, // Retention: 7 days in Redis
//       count: 5000,
//     },
//   },
// });


import { Queue } from "bullmq";
import Redis from "ioredis";
import { env } from "../../config/env";
import { ISyncJobPayload } from "./sync.types";

export const QUEUE_NAME = "product-sync-queue";

const redisUrl = env.REDIS_URL || (env.REDIS_ENABLED ? `redis://${env.REDIS_HOST || 'localhost'}:${env.REDIS_PORT || 6379}` : "");

export const redisConnection = redisUrl
  ? new Redis(redisUrl, {
      password: env.REDIS_PASSWORD || undefined,
      db: env.REDIS_DB || 0,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
      enableOfflineQueue: true,
    })
  : null;

redisConnection?.on("connect", () => {
  console.log("✅ Connected to Redis/Valkey successfully");
});

redisConnection?.on("error", (err) => {
  console.warn("⚠️ Redis is unavailable or not reachable; queue processing will be skipped until Redis is available.", err.message);
});

export const productSyncQueue = redisConnection
  ? new Queue<ISyncJobPayload>(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: env.SYNC_MAX_RETRIES || 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400, // Retention: 24 hours in Redis
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // Retention: 7 days in Redis
          count: 5000,
        },
      },
    })
  : null;
