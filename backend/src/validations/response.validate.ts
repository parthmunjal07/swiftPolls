import { z } from "zod";

const answerSchema = z.object({
  ques_id: z.number().int(),
  option_id: z.number().int(),
});

export const submitAsyncResponseSchema = z.object({
  poll_id: z.number().int(),
  answers: z
    .array(answerSchema)
    .min(1, "You must answer at least one question"),
  session_token: z.string().min(1).max(255),
});

export const submitLiveAnswerSchema = z.object({
  session_id: z.number().int(),
  poll_id: z.number().int(),
  ques_id: z.number().int(),
  option_id: z.number().int(),
  session_token: z.string().min(1).max(255),
});

export const joinSessionSchema = z.object({
  room_code: z
    .string()
    .min(6, "Room code must be 6 characters")
    .max(8, "Room code too long")
    .toUpperCase(),
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(100)
    .optional(),
});