import type { Request, Response } from "express";
import { and, eq, count, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  polls,
  questions,
  options,
  responses,
  response_ans,
  analytics,
  sessions,
} from "../db/schema.js";
import { redis } from "../utils/redis.js";

const flushRedisToDB = async (pollId: number) => {
  const keys = await redis.keys(`analytics:${pollId}:*`);
  if (keys.length === 0) return;

  const pipeline = redis.pipeline();
  keys.forEach((key: string) => pipeline.get(key));
  const results = await pipeline.exec();

  const updates: { optionId: number; count: number }[] = [];

  keys.forEach((key: string, index: number) => {
    const val = results?.[index]?.[1];
    if (val && parseInt(val as string, 10) > 0) {
      const optionId = parseInt(key.split(":")[2] as string, 10);
      const count = parseInt(val as string, 10);
      updates.push({ optionId, count });
    }
  });

  if (updates.length === 0) return;

  const delPipeline = redis.pipeline();
  updates.forEach(({ optionId, count }) => {
    delPipeline.decrby(`analytics:${pollId}:${optionId}`, count);
  });
  await delPipeline.exec();

  await db.transaction(async (tx) => {
    for (const { optionId, count: delta } of updates) {
      const [existing] = await tx
        .select()
        .from(analytics)
        .where(
          and(
            eq(analytics.poll_id, pollId),
            eq(analytics.option_id, optionId),
            sql`${analytics.session_id} IS NULL`,
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .update(analytics)
          .set({ count: existing.count + delta, recorded_at: new Date() })
          .where(eq(analytics.id, existing.id));
      } else {
        await tx.insert(analytics).values({
          poll_id: pollId,
          session_id: null,
          option_id: optionId,
          count: delta,
          recorded_at: new Date(),
        });
      }
    }
  });
};

export const getPollAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pollId = parseInt(req.params.pollId as string);
    if (isNaN(pollId))
      return res.status(400).json({ message: "Invalid poll ID" });

    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.user_id, userId)))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    await flushRedisToDB(pollId);

    const totalResponsesResult = await db
      .select({ totalResponses: count() })
      .from(responses)
      .where(eq(responses.poll_id, pollId));
    const totalResponses = totalResponsesResult[0]?.totalResponses ?? 0;

    const pollQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.poll_id, pollId))
      .orderBy(questions.display_order);

    const snapshots = await db
      .select()
      .from(analytics)
      .where(
        and(
          eq(analytics.poll_id, pollId),
          sql`${analytics.session_id} IS NULL`,
        ),
      );

    const snapshotMap = new Map<number, number>();
    snapshots.forEach((s) => snapshotMap.set(s.option_id, s.count));

    const directCounts = await db
      .select({
        option_id: response_ans.option_id,
        count: count(),
      })
      .from(response_ans)
      .innerJoin(responses, eq(response_ans.response_id, responses.id))
      .where(eq(responses.poll_id, pollId))
      .groupBy(response_ans.option_id);

    const directMap = new Map<number, number>();
    directCounts.forEach((r) => directMap.set(r.option_id, r.count));

    const perQuestion = await Promise.all(
      pollQuestions.map(async (q) => {
        const opts = await db
          .select()
          .from(options)
          .where(eq(options.ques_id, q.id))
          .orderBy(options.display_order);

        const questionTotal = opts.reduce((sum, opt) => {
          const c = snapshotMap.get(opt.id) ?? directMap.get(opt.id) ?? 0;
          return sum + c;
        }, 0);

        const optionsWithStats = opts.map((opt) => {
          const optCount =
            snapshotMap.get(opt.id) ?? directMap.get(opt.id) ?? 0;
          const percentage =
            questionTotal > 0
              ? Math.round((optCount / questionTotal) * 100)
              : 0;
          return {
            id: opt.id,
            text: opt.text,
            display_order: opt.display_order,
            count: optCount,
            percentage,
          };
        });

        return {
          id: q.id,
          body: q.body,
          is_mandatory: q.is_mandatory,
          display_order: q.display_order,
          total_answers: questionTotal,
          options: optionsWithStats,
        };
      }),
    );

    return res.status(200).json({
      poll_id: pollId,
      mode: poll.mode,
      total_responses: totalResponses,
      per_question: perQuestion,
    });
  } catch (error) {
    console.error("getPollAnalytics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getSessionAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pollId = parseInt(req.params.pollId as string);
    const sessionId = parseInt(req.params.sessionId as string);
    if (isNaN(pollId) || isNaN(sessionId)) {
      return res.status(400).json({ message: "Invalid poll or session ID" });
    }

    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.user_id, userId)))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.poll_id, pollId)))
      .limit(1);

    if (!session) return res.status(404).json({ message: "Session not found" });

    const totalResponsesResult = await db
      .select({ totalResponses: count() })
      .from(responses)
      .where(
        and(eq(responses.poll_id, pollId), eq(responses.session_id, sessionId)),
      );
    const totalResponses = totalResponsesResult[0]?.totalResponses ?? 0;

    const sessionCounts = await db
      .select({
        option_id: response_ans.option_id,
        count: count(),
      })
      .from(response_ans)
      .innerJoin(responses, eq(response_ans.response_id, responses.id))
      .where(
        and(eq(responses.poll_id, pollId), eq(responses.session_id, sessionId)),
      )
      .groupBy(response_ans.option_id);

    const countMap = new Map<number, number>();
    sessionCounts.forEach((r) => countMap.set(r.option_id, r.count));

    const pollQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.poll_id, pollId))
      .orderBy(questions.display_order);

    const perQuestion = await Promise.all(
      pollQuestions.map(async (q) => {
        const opts = await db
          .select()
          .from(options)
          .where(eq(options.ques_id, q.id))
          .orderBy(options.display_order);

        const questionTotal = opts.reduce(
          (sum, opt) => sum + (countMap.get(opt.id) ?? 0),
          0,
        );

        const optionsWithStats = opts.map((opt) => {
          const optCount = countMap.get(opt.id) ?? 0;
          const percentage =
            questionTotal > 0
              ? Math.round((optCount / questionTotal) * 100)
              : 0;
          return {
            id: opt.id,
            text: opt.text,
            display_order: opt.display_order,
            count: optCount,
            percentage,
          };
        });

        return {
          id: q.id,
          body: q.body,
          is_mandatory: q.is_mandatory,
          display_order: q.display_order,
          total_answers: questionTotal,
          options: optionsWithStats,
        };
      }),
    );

    return res.status(200).json({
      poll_id: pollId,
      session_id: sessionId,
      session_status: session.status,
      total_responses: totalResponses,
      per_question: perQuestion,
    });
  } catch (error) {
    console.error("getSessionAnalytics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getResponseTrend = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pollId = parseInt(req.params.pollId as string);
    if (isNaN(pollId))
      return res.status(400).json({ message: "Invalid poll ID" });

    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.user_id, userId)))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    const range = req.query.range === "30d" ? "30d" : "24h";

    const trendData = await db.execute(
      range === "24h"
        ? sql`
            SELECT
              date_trunc('hour', submitted_at) AS period,
              COUNT(*) AS response_count
            FROM responses
            WHERE poll_id = ${pollId}
              AND submitted_at >= NOW() - INTERVAL '24 hours'
            GROUP BY period
            ORDER BY period ASC
          `
        : sql`
            SELECT
              date_trunc('day', submitted_at) AS period,
              COUNT(*) AS response_count
            FROM responses
            WHERE poll_id = ${pollId}
              AND submitted_at >= NOW() - INTERVAL '30 days'
            GROUP BY period
            ORDER BY period ASC
          `,
    );

    return res.status(200).json({
      poll_id: pollId,
      range,
      trend: trendData.rows.map((row: any) => ({
        period: row.period,
        count: parseInt(row.response_count, 10),
      })),
    });
  } catch (error) {
    console.error("getResponseTrend error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getPollSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pollId = parseInt(req.params.pollId as string);
    if (isNaN(pollId))
      return res.status(400).json({ message: "Invalid poll ID" });

    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.user_id, userId)))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    const totalResponsesResult = await db
      .select({ totalResponses: count() })
      .from(responses)
      .where(eq(responses.poll_id, pollId));
    const totalResponses = totalResponsesResult[0]?.totalResponses ?? 0;

    const totalQuestionsResult = await db
      .select({ totalQuestions: count() })
      .from(questions)
      .where(eq(questions.poll_id, pollId));
    const totalQuestions = totalQuestionsResult[0]?.totalQuestions ?? 0;

    const [lastResponse] = await db
      .select({ submitted_at: responses.submitted_at })
      .from(responses)
      .where(eq(responses.poll_id, pollId))
      .orderBy(sql`submitted_at DESC`)
      .limit(1);

    return res.status(200).json({
      poll_id: pollId,
      total_responses: totalResponses,
      total_questions: totalQuestions,
      last_response_at: lastResponse?.submitted_at ?? null,
    });
  } catch (error) {
    console.error("getPollSummary error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
