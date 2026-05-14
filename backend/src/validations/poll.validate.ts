import { z } from "zod";

const optionSchema = z.object({
  text: z.string().min(1, "Option text cannot be empty").max(255),
  display_order: z.number().int().min(0),
});

const timeLimitSecsSchema = z.preprocess((raw) => {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 5 || n > 300) return null;
  return Math.floor(n);
}, z.union([z.null(), z.number().int().min(5).max(300)]));

const questionSettingsSchema = z.object({
  show_results_live: z.boolean().default(false),
  time_limit_secs: timeLimitSecsSchema.optional().default(null),
});

const questionSchema = z.object({
  body: z.string().min(1, "Question body cannot be empty").max(322),
  is_mandatory: z.boolean().default(true),
  display_order: z.number().int().min(0),
  options: z
    .array(optionSchema)
    .min(2, "Each question must have at least 2 options")
    .max(10, "A question can have at most 10 options"),
  settings: questionSettingsSchema.optional(),
});

/** Relaxed shapes for create; strict rules applied in superRefine when draft is false */
const createOptionSchema = z.object({
  text: z.string().max(255),
  display_order: z.number().int().min(0),
});

const createQuestionSchema = z.object({
  body: z.string().max(322),
  is_mandatory: z.boolean().default(true),
  display_order: z.number().int().min(0),
  options: z.array(createOptionSchema).max(10),
  settings: questionSettingsSchema.optional(),
});

export const createPollSchema = z
  .object({
    title: z.string().max(50),
    description: z.string().max(322).optional(),
    mode: z.enum(["live", "async"]).default("async"),
    is_anonymous: z.boolean().default(false),
    expires_at: z.string().datetime().optional(),
    draft: z.boolean().optional().default(false),
    questions: z.array(createQuestionSchema).max(50),
  })
  .refine(
    (data) => {
      if (data.mode === "live" && data.expires_at) return false;
      return true;
    },
    {
      message: "expires_at is only valid for async polls",
      path: ["expires_at"],
    }
  )
  .superRefine((data, ctx) => {
    if (data.draft) return;

    if (data.title.trim().length < 5) {
      ctx.addIssue({
        code: "custom",
        message: "Title must be at least 5 characters",
        path: ["title"],
      });
    }

    if (data.questions.length < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Poll must have at least one question",
        path: ["questions"],
      });
    }

    data.questions.forEach((q, qi) => {
      if (!q.body.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Question body cannot be empty",
          path: ["questions", qi, "body"],
        });
      }
      if (q.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Each question must have at least 2 options",
          path: ["questions", qi, "options"],
        });
      }
      q.options.forEach((o, oj) => {
        if (!o.text.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Option text cannot be empty",
            path: ["questions", qi, "options", oj, "text"],
          });
        }
      });
    });
  });

export const updatePollSchema = z.object({
  title: z.string().min(5).max(50).optional(),
  description: z.string().max(322).optional(),
  is_anonymous: z.boolean().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  questions: z.array(questionSchema).min(1).max(50).optional(),
});

export const startSessionSchema = z.object({
  poll_id: z.number().int(),
});

export const presenterActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("next_question") }),
  z.object({ action: z.literal("prev_question") }),
  z.object({ action: z.literal("open_answers") }),
  z.object({ action: z.literal("close_answers") }),
  z.object({
    action: z.literal("set_results_visible"),
    visible: z.boolean(),
  }),
  z.object({ action: z.literal("end_session") }),
]);

export const publishPollSchema = z.object({
  poll_id: z.number().int(),
});