import { z } from "zod";

export const submitResponseSchema = z.object({
  poll_id: z.number().int(),
  answers: z.array(z.object({
    ques_id: z.number().int(),
    option_id: z.number().int(),
  })).min(1, "You must answer at least one question"),
});