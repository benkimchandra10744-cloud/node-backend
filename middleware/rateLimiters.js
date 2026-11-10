import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

const redisClient = process.env.REDIS_URL
  ? createClient({ url: process.env.REDIS_URL })
  : null;

redisClient?.on("error", (error) => {
  console.error("Rate-limit Redis connection failed:", error.message);
});

export async function connectRateLimitStore() {
  if (redisClient && !redisClient.isOpen) {
    await redisClient.connect();
    console.log("Rate-limit Redis store connected");
  }
  if (!redisClient) {
    console.warn(
      "REDIS_URL is not set; rate limits are stored per worker and are not shared across PM2 cluster instances."
    );
  }
}

export async function closeRateLimitStore() {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
}

export function createRateLimiter({ windowMs, limit, message, prefix }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: message },
    ...(redisClient
      ? {
          store: new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
            prefix
          })
        }
      : {}),
    handler(req, res) {
      if (req.originalUrl.startsWith("/api/")) {
        return res.status(429).json({ error: message });
      }
      return res.status(429).render("error", {
        title: "Too many requests",
        message
      });
    }
  });
}

export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many login attempts. Please try again after 15 minutes.",
  prefix: "ratelimit:login:"
});

export const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many signup attempts. Please try again after an hour.",
  prefix: "ratelimit:signup:"
});

export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: "Too many image uploads. Please try again after an hour.",
  prefix: "ratelimit:upload:"
});

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many API requests. Please try again after 15 minutes.",
  prefix: "ratelimit:api:"
});
