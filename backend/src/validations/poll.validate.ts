import { z } from "zod";

const optionSchema = z.object({
  text: z.string().min(1, "Option text cannot be empty").max(255),
});

const questionSchema = z.object({
  body: z.string().min(1, "Question body cannot be empty").max(322),
  is_mandatory: z.boolean().default(true),
  options: z.array(optionSchema).min(2, "Each question must have at least 2 options"),
});

export const createPollSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(50),
  description: z.string().max(322).optional(),
  is_anonymous: z.boolean().default(false),
  expires_at: z.string().datetime().optional(), 
  questions: z.array(questionSchema).min(1, "Poll must have at least one question"),
});