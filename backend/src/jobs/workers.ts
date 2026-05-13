// @ts-ignore
import { Worker } from "bullmq";
import { eq, and, inArray } from "drizzle-orm";
import { redis } from "../utils/redis.js";
import { db } from "../db/index.js";
import { polls, users, analytics } from "../db/schema.js";
import { sendPollExpiryEmail } from "../utils/mailer.js";
import { io } from "../server.js";

// Worker for handling poll expirations
export const expiryWorker = new Worker(
  "poll-expiry",
  async (job: any) => {
    const { pollId } = job.data;
    console.log(`Processing expiry for poll ${pollId}`);

    const [pollData] = await db
      .select({
        poll: polls,
        userEmail: users.email,
      })
      .from(polls)
      .leftJoin(users, eq(polls.user_id, users.id))
      .where(eq(polls.id, pollId))
      .limit(1);

    if (pollData && pollData.poll) {
      // Mark as inactive if not already
      await db
        .update(polls)
        .set({ is_active: false, updated_at: new Date() })
        .where(eq(polls.id, pollId));

      // Push WS event to anyone looking at the form view
      // We can emit to a room specific to the poll slug
      io.to(`poll_${pollData.poll.slug}`).emit("poll_closed");

      if (pollData.userEmail) {
        const pollUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/poll/${pollData.poll.slug}`;
        await sendPollExpiryEmail(pollData.userEmail, pollData.poll.title, pollUrl);
      }
    }
  },
  { connection: redis }
);

// Worker for flushing analytics from Redis to Postgres
export const analyticsWorker = new Worker(
  "analytics-snapshot",
  async () => {
    // We get all keys matching 'analytics:*'
    const keys = await redis.keys("analytics:*");
    if (keys.length === 0) return;

    // Keys format: analytics:{pollId}:{optionId}
    // We will pop them atomically or just get and delete
    // To be safe, we can use a pipeline
    const pipeline = redis.pipeline();
    keys.forEach((key: string) => pipeline.get(key));
    const counts = await pipeline.exec();

    // Reset the keys in redis to 0 (or delete them)
    // Actually, better to use atomic operations: getset or let's just delete the ones we read
    // If more votes come in during this fraction of a second, they might be lost if we just delete
    // Better: use HINCRBY in a hash, or script. 
    // For simplicity, we just DEL them since we read them
    const delPipeline = redis.pipeline();
    
    const updates: { pollId: number; optionId: number; count: number }[] = [];

    keys.forEach((key: string, index: number) => {
      if (counts && counts[index] && counts[index][1]) {
        const count = parseInt(counts[index][1] as string, 10);
        if (count > 0) {
          const parts = key.split(":");
          const pollId = parseInt(parts[1] as string, 10);
          const optionId = parseInt(parts[2] as string, 10);
          updates.push({ pollId, optionId, count });
          
          // Decrement the count we just processed
          delPipeline.decrby(key, count);
        }
      }
    });
    await delPipeline.exec();

    if (updates.length > 0) {
      await db.transaction(async (tx) => {
        for (const update of updates) {
          const [existing] = await tx
            .select()
            .from(analytics)
            .where(
              and(
                eq(analytics.poll_id, update.pollId),
                eq(analytics.option_id, update.optionId)
              )
            )
            .limit(1);

          if (existing) {
            await tx
              .update(analytics)
              .set({ count: existing.count + update.count })
              .where(eq(analytics.id, existing.id));
          } else {
            await tx.insert(analytics).values({
              poll_id: update.pollId,
              session_id: null,
              option_id: update.optionId,
              count: update.count,
              recorded_at: new Date(),
            });
          }
        }
      });
      console.log(`Flushed ${updates.length} analytics updates to Postgres`);
    }
  },
  { connection: redis }
);
