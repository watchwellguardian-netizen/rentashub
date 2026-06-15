const DEFAULT_WINDOW_MS = 60_000;
const buckets = new Map();

function clientKey(req, keyPrefix) {
  const userId = req.user?.id || req.headers["x-user-id"] || "anonymous";
  const ip = req.socket?.remoteAddress || "local";
  return `${keyPrefix}:${ip}:${userId}`;
}

export function createRateLimiter({ keyPrefix = "default", windowMs = DEFAULT_WINDOW_MS, max = 30 } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = clientKey(req, keyPrefix);
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", new Date(bucket.resetAt).toISOString());

    if (bucket.count > max) {
      res.json(429, {
        error: "rate_limited",
        message: "Too many requests. Please wait before trying again.",
        retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      });
      return;
    }
    next();
  };
}

export function resetRateLimitersForTests() {
  buckets.clear();
}
