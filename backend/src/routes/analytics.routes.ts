import { Router } from "express";
import {
  getPollAnalytics,
  getSessionAnalytics,
  getResponseTrend,
  getPollSummary,
} from "../controllers/analytics.controller.js";
import { restrictToAuthenticatedUser } from "../middlewares/auth.middleware.js";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/:pollId",
  restrictToAuthenticatedUser(),
  getPollAnalytics
);

analyticsRouter.get(
  "/:pollId/summary",
  restrictToAuthenticatedUser(),
  getPollSummary
);

analyticsRouter.get(
  "/:pollId/trend",
  restrictToAuthenticatedUser(),
  getResponseTrend
);

analyticsRouter.get(
  "/:pollId/session/:sessionId",
  restrictToAuthenticatedUser(),
  getSessionAnalytics
);