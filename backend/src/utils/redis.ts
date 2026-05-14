import { Redis } from "ioredis";

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err: any) => {
  console.error("Redis connection error:", err);
});
