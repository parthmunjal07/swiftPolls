import { Router } from "express";
import { submitAsyncResponse, submitLiveResponse } from "../controllers/response.controller.js";
import { authenticationMiddleware } from "../middlewares/auth.middleware.js";
import { submissionRateLimiter } from "../middlewares/rateLimiter.middleware.js";

export const responseRouter = Router();

responseRouter.post(
  "/async",
  submissionRateLimiter,
  authenticationMiddleware(),
  submitAsyncResponse
);

responseRouter.post(
  "/",
  submissionRateLimiter,
  authenticationMiddleware(),
  submitLiveResponse
);
