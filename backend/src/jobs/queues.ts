// @ts-ignore
import { Queue } from "bullmq";
import { redis } from "../utils/redis.js";

export const expiryQueue = new Queue("poll-expiry", { connection: redis });

export const analyticsQueue = new Queue("analytics-snapshot", { connection: redis });

export const schedulePollExpiry = async (pollId: number, expiresAt: Date) => {
  const delay = expiresAt.getTime() - Date.now();
  if (delay > 0) {
    await expiryQueue.add(
      "expire-poll",
      { pollId },
      { delay, jobId: `expire-poll-${pollId}` }
    );
    console.log(`Scheduled expiry for poll ${pollId} in ${delay}ms`);
  }
};

export const initRepeatableJobs = async () => {
  await analyticsQueue.add(
    "flush-analytics",
    {},
    {
      repeat: {
        pattern: "*/10 * * * * *",
      },
    }
  );
};
