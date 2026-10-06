import assert from "assert";
import { redisLogTarget, resolveRedisUrl } from "../config/redis-url";

function run() {
  assert.strictEqual(
    resolveRedisUrl({ REDIS_HOST: "redis://cache.internal:6379" }),
    "redis://cache.internal:6379",
    "A REDIS_HOST URL is the BullMQ connection string"
  );
  assert.strictEqual(
    resolveRedisUrl({ REDIS_HOST: "rediss://cache.internal:6380" }),
    "rediss://cache.internal:6380"
  );
  assert.strictEqual(
    resolveRedisUrl({ REDIS_URL: "redis://explicit:6379", REDIS_HOST: "redis://other:6379" }),
    "redis://explicit:6379",
    "REDIS_URL wins over REDIS_HOST"
  );
  assert.strictEqual(
    resolveRedisUrl({ REDIS_HOST: "127.0.0.1", REDIS_PORT: "6380" }),
    "redis://127.0.0.1:6380"
  );
  assert.strictEqual(resolveRedisUrl({}), "", "Redis stays disabled when it is not configured");
  assert.strictEqual(
    resolveRedisUrl({ REDIS_HOST: "redis://127.0.0.1:6379", REDIS_PORT: "6380" }),
    "redis://127.0.0.1:6379",
    "A local REDIS_HOST URL is used as-is"
  );
  assert.strictEqual(
    resolveRedisUrl({
      REDIS_HOST: "cache.internal",
      REDIS_PORT: "6379",
      REDIS_PASSWORD: "secret",
      REDIS_DB: "2",
    }),
    "redis://:secret@cache.internal:6379/2"
  );
  assert.strictEqual(
    resolveRedisUrl({ REDIS_URL: "redis://prod-host:6379", REDIS_HOST: "127.0.0.1", REDIS_PASSWORD: "secret" }),
    "redis://prod-host:6379",
    "Production REDIS_URL is not rewritten with local host or password"
  );
  assert.strictEqual(redisLogTarget("redis://:secret@127.0.0.1:6379/2"), "127.0.0.1:6379");
  console.log("Redis queue initialization tests passed");
}

run();
