import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  polls,
  questions,
  responses,
  response_ans,
} from "../db/schema.js";
import { submitAsyncResponseSchema } from "../validations/response.validate.js";
import { redis } from "../utils/redis.js";

export const submitAsyncResponse = async (req: Request, res: Response) => {
  try {
    const parsed = submitAsyncResponseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ errors: parsed.error.flatten().fieldErrors });
    }

    const { poll_id, answers, session_token } = parsed.data;

    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.id, poll_id))
      .limit(1);

    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (!poll.is_active) {
      return res.status(410).json({ message: "This poll is no longer active" });
    }

    if (poll.expires_at && new Date() > poll.expires_at) {
      return res.status(410).json({ message: "This poll has expired" });
    }

    // if (poll.published_at) {
    //   return res.status(403).json({ message: "Poll results have already been published" });
    // }

    const user_id = req.user?.id || null;
    if (!poll.is_anonymous && !user_id) {
      return res.status(401).json({
        message: "Authentication is required to respond to this poll",
      });
    }

    let duplicateQuery;
    if (user_id) {
      duplicateQuery = and(
        eq(responses.poll_id, poll_id),
        eq(responses.user_id, user_id)
      );
    } else {
      duplicateQuery = and(
        eq(responses.poll_id, poll_id),
        eq(responses.session_token, session_token)
      );
    }

    const [existingResponse] = await db
      .select()
      .from(responses)
      .where(duplicateQuery)
      .limit(1);

    if (existingResponse) {
      return res.status(409).json({ message: "You have already responded to this poll" });
    }

    const pollQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.poll_id, poll_id));

    const answeredQuesIds = new Set(answers.map((a) => a.ques_id));
    const missingMandatory = pollQuestions.filter(
      (q) => q.is_mandatory && !answeredQuesIds.has(q.id)
    );

    if (missingMandatory.length > 0) {
      return res.status(400).json({
        message: "Missing answers for mandatory questions",
        missing_question_ids: missingMandatory.map((q) => q.id),
      });
    }

    await db.transaction(async (tx) => {
      const [newResponse] = await tx
        .insert(responses)
        .values({
          poll_id,
          session_id: null,
          user_id,
          session_token,
          submitted_at: new Date(),
        })
        .returning();

      if (!newResponse) {
        throw new Error("Failed to insert response");
      }

      await tx.insert(response_ans).values(
        answers.map((a) => ({
          response_id: newResponse.id,
          ques_id: a.ques_id,
          option_id: a.option_id,
        }))
      );

      const pipeline = redis.pipeline();
      for (const ans of answers) {
        pipeline.incr(`analytics:${poll_id}:${ans.option_id}`);
      }
      await pipeline.exec();
    });

    return res.status(201).json({ message: "Response submitted successfully" });
  } catch (error) {
    console.error("submitAsyncResponse error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
