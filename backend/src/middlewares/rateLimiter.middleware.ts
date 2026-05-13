// @ts-ignore
import rateLimit from "express-rate-limit";

// Limit to 5 submissions per 1 minute window per IP address
export const submissionRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 5, 
  message: {
    message: "Too many submissions from this IP, please try again after a minute"
  },
  standardHeaders: true, 
  legacyHeaders: false,
});
