import { z } from "zod";

const optionSchema = z.object({
  text: z.string().min(1, "Option text cannot be empty").max(255),
  display_order: z.number().int().min(0),
});

const questionSettingsSchema = z.object({
  show_results_live: z.boolean().default(false),
  time_limit_secs: z.number().int().min(5).max(300).nullable().default(null),
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

export const createPollSchema = z
  .object({
    title: z
      .string()
      .min(5, "Title must be at least 5 characters")
      .max(50, "Title cannot exceed 50 characters"),
    description: z.string().max(322).optional(),
    mode: z.enum(["live", "async"]).default("async"),
    is_anonymous: z.boolean().default(false),
    expires_at: z.string().datetime().optional(),
    questions: z
      .array(questionSchema)
      .min(1, "Poll must have at least one question")
      .max(50, "Poll cannot exceed 50 questions"),
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
  );

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