import { Router } from "express";
import { submitAsyncResponse } from "../controllers/response.controller.js";
import { authenticationMiddleware } from "../middlewares/auth.middleware.js";

export const responseRouter = Router();

// Endpoint for submitting responses to async polls. 
// Uses authenticationMiddleware to parse the token if present, 
// since some polls require authentication while others are anonymous.
responseRouter.post(
  "/async",
  authenticationMiddleware(),
  submitAsyncResponse
);
