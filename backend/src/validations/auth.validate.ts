import z from 'zod'

export const signupModel = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginModel = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});