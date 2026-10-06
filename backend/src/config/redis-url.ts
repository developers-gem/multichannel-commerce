/**
 * BullMQ connection string from the existing Redis environment.
 * REDIS_URL wins. A REDIS_HOST value that is already a redis:// or rediss:// URL is used as-is.
 * Otherwise host, port, password, and database are combined. Nothing is opened when Redis is not configured.
 */
export function resolveRedisUrl(source: {
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string | number;
  REDIS_PASSWORD?: string;
  REDIS_DB?: string | number;
  REDIS_ENABLED?: string | boolean;
} = process.env): string {
  const explicitUrl = String(source.REDIS_URL || "").trim();
  if (explicitUrl) return explicitUrl;

  const host = String(source.REDIS_HOST || "").trim();
  if (host.startsWith("redis://") || host.startsWith("rediss://")) return host;

  const enabled = source.REDIS_ENABLED === true || source.REDIS_ENABLED === "true";
  if (!enabled && !host) return "";

  const port = Number(source.REDIS_PORT) || 6379;
  const hostname = host || "localhost";
  const database = source.REDIS_DB === undefined || source.REDIS_DB === "" ? 0 : Number(source.REDIS_DB);
  const db = Number.isFinite(database) ? database : 0;
  const password = String(source.REDIS_PASSWORD || "");
  const path = db ? `/${db}` : "";
  if (password) {
    return `redis://:${encodeURIComponent(password)}@${hostname}:${port}${path}`;
  }
  return `redis://${hostname}:${port}${path}`;
}

/** Hostname and port only, so connection logs never include a password. */
export function redisLogTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || "6379"}`;
  } catch {
    return "redis";
  }
}
