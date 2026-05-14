import type { Request, Response } from "express";
import { and, eq, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import {
  polls,
  questions,
  options,
  question_settings,
  responses,
} from "../db/schema.js";
import {
  createPollSchema,
  updatePollSchema,
} from "../validations/poll.validate.js";
import { schedulePollExpiry } from "../jobs/queues.js";
import type { z } from "zod";

function normalizeDraftCreatePoll(
  data: z.infer<typeof createPollSchema>
): z.infer<typeof createPollSchema> {
  if (!data.draft) return data;

  const title = data.title.trim() || "Untitled poll";

  let questions = data.questions.map((q, index) => {
    const body = q.body.trim() || `Question ${index + 1}`;
    let options = q.options.map((o, j) => ({
      text: o.text.trim() || `Option ${j + 1}`,
      display_order: j,
    }));
    while (options.length < 2) {
      options.push({
        text: `Option ${options.length + 1}`,
        display_order: options.length,
      });
    }
    const capped = options.slice(0, 10).map((o, j) => ({ ...o, display_order: j }));
    return {
      ...q,
      body,
      display_order: index,
      options: capped,
    };
  });

  if (questions.length === 0) {
    questions = [
      {
        body: "Question 1",
        is_mandatory: true,
        display_order: 0,
        options: [
          { text: "Option 1", display_order: 0 },
          { text: "Option 2", display_order: 1 },
        ],
        settings: { show_results_live: false, time_limit_secs: null },
      },
    ];
  }

  return { ...data, title, questions };
}

// post /api/polls
export const createPoll = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = createPollSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const normalized = normalizeDraftCreatePoll(parsed.data);
    const { title, description, mode, is_anonymous, expires_at, questions: rawQuestions, draft } =
      normalized;

    const slug = nanoid(8);

    const result = await db.transaction(async (tx) => {

      const [newPoll] = await tx
        .insert(polls)
        .values({
          user_id: userId,
          title,
          description,
          slug,
          mode,
          is_anonymous,
          is_active: true,
          expires_at: expires_at ? new Date(expires_at) : null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!newPoll) {
        throw new Error("Failed to create poll");
      }

      const insertedQuestions = [];

      for (const q of rawQuestions) {
        const [newQuestion] = await tx
          .insert(questions)
          .values({
            poll_id: newPoll.id,
            body: q.body,
            is_mandatory: q.is_mandatory,
            display_order: q.display_order,
            created_at: new Date(),
          })
          .returning();

        if (!newQuestion) {
          throw new Error("Failed to create question");
        }

        const insertedOptions = await tx
          .insert(options)
          .values(
            q.options.map((opt, idx) => ({
              ques_id: newQuestion.id,
              text: opt.text,
              display_order: opt.display_order ?? idx,
              created_at: new Date(),
            }))
          )
          .returning();

        const [settings] = await tx
          .insert(question_settings)
          .values({
            ques_id: newQuestion.id,
            show_results_live: q.settings?.show_results_live ?? false,
            time_limit_secs: q.settings?.time_limit_secs ?? null,
            created_at: new Date(),
          })
          .returning();

        insertedQuestions.push({
          ...newQuestion,
          options: insertedOptions,
          settings,
        });
      }

      return { ...newPoll, questions: insertedQuestions };
    });

    if (result.expires_at && !draft) {
      await schedulePollExpiry(result.id, result.expires_at);
    }

    return res.status(201).json({ message: "Poll created successfully", poll: result });
  } catch (error) {
    console.error("createPoll error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// get api/polls
export const getMyPolls = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log("Failed: userId is undefined!");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const myPolls = await db
      .select()
      .from(polls)
      .where(eq(polls.user_id, userId))
      .orderBy(polls.created_at);

    return res.status(200).json({ polls: myPolls });
  } catch (error) {
    console.error("getMyPolls error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// get api/polls/:id
export const getPollById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pollId = parseInt(req.params.id as string);
    if (isNaN(pollId)) return res.status(400).json({ message: "Invalid poll ID" });

    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.user_id, userId)))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    const pollQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.poll_id, pollId))
      .orderBy(questions.display_order);

    const questionsWithDetails = await Promise.all(
      pollQuestions.map(async (q) => {
        const [opts, [settings]] = await Promise.all([
          db.select().from(options).where(eq(options.ques_id, q.id)).orderBy(options.display_order),
          db.select().from(question_settings).where(eq(question_settings.ques_id, q.id)).limit(1),
        ]);
        return { ...q, options: opts, settings: settings ?? null };
      })
    );

    return res.status(200).json({ poll: { ...poll, questions: questionsWithDetails } });
  } catch (error) {
    console.error("getPollById error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// get /api/polls/slug/:slug 
export const getPollBySlug = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;

    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.slug, slug))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    // 1. Check if expired
    if (poll.expires_at && new Date() > poll.expires_at) {
      // If expired, maybe you want to show results here?
      const pollQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.poll_id, poll.id))
        .orderBy(questions.display_order);

      const questionsWithOptions = await Promise.all(
        pollQuestions.map(async (q) => {
          const opts = await db
            .select()
            .from(options)
            .where(eq(options.ques_id, q.id))
            .orderBy(options.display_order);
          return { ...q, options: opts };
        })
      );

      // Let's show results if expired
      return res.status(200).json({
        poll: { ...poll, questions: questionsWithOptions },
        view: "results",
      });
    }

    // 2. Check if inactive (manually closed)
    if (!poll.is_active) {
      // Similar to expired, show results or an inactive message
      // ... fetch questions ...
      return res.status(200).json({
        // poll data
        view: "results" // or "inactive" depending on your preference
      });
    }

    // 3. Default: Poll is active and open for voting!
    const pollQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.poll_id, poll.id))
      .orderBy(questions.display_order);

    const questionsWithOptions = await Promise.all(
      pollQuestions.map(async (q) => {
        const opts = await db
          .select()
          .from(options)
          .where(eq(options.ques_id, q.id))
          .orderBy(options.display_order);
        return { ...q, options: opts };
      })
    );

    return res.status(200).json({
      poll: { ...poll, questions: questionsWithOptions },
      view: "form",
    });
  } catch (error) {
    console.error("getPollBySlug error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// patch /api/polls/:id
export const updatePoll = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pollId = parseInt(req.params.id as string);
    if (isNaN(pollId)) return res.status(400).json({ message: "Invalid poll ID" });

    const parsed = updatePollSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.user_id, userId)))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    const [responseStats] = await db
      .select({ responseCount: count() })
      .from(responses)
      .where(eq(responses.poll_id, pollId));

    if (responseStats && responseStats.responseCount > 0) {
      return res.status(409).json({
        message: "Cannot edit a poll that has already received responses",
      });
    }

    const { title, description, is_anonymous, expires_at } = parsed.data;

    const [updated] = await db
      .update(polls)
      .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(is_anonymous !== undefined && { is_anonymous }),
        ...(expires_at !== undefined && {
          expires_at: expires_at ? new Date(expires_at) : null,
        }),
        updated_at: new Date(),
      })
      .where(eq(polls.id, pollId))
      .returning();

    return res.status(200).json({ message: "Poll updated", poll: updated });
  } catch (error) {
    console.error("updatePoll error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// delete /api/polls/:id 

export const deletePoll = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pollId = parseInt(req.params.id as string);
    if (isNaN(pollId)) return res.status(400).json({ message: "Invalid poll ID" });

    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.user_id, userId)))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    await db.transaction(async (tx) => {
      const pollQuestions = await tx
        .select({ id: questions.id })
        .from(questions)
        .where(eq(questions.poll_id, pollId));

      const questionIds = pollQuestions.map((q) => q.id);

      if (questionIds.length > 0) {
        for (const qId of questionIds) {
          await tx.delete(question_settings).where(eq(question_settings.ques_id, qId));
          await tx.delete(options).where(eq(options.ques_id, qId));
        }
      }

      await tx.delete(responses).where(eq(responses.poll_id, pollId));
      await tx.delete(questions).where(eq(questions.poll_id, pollId));
      await tx.delete(polls).where(eq(polls.id, pollId));
    });

    return res.status(200).json({ message: "Poll deleted successfully" });
  } catch (error) {
    console.error("deletePoll error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// patch /api/polls/:id/publish

export const publishPoll = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pollId = parseInt(req.params.id as string);
    if (isNaN(pollId)) return res.status(400).json({ message: "Invalid poll ID" });

    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.user_id, userId)))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (poll.published_at) {
      return res.status(409).json({ message: "Poll is already published" });
    }

    const [updated] = await db
      .update(polls)
      .set({ published_at: new Date(), updated_at: new Date() })
      .where(eq(polls.id, pollId))
      .returning();

    return res.status(200).json({ message: "Poll published", poll: updated });
  } catch (error) {
    console.error("publishPoll error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};