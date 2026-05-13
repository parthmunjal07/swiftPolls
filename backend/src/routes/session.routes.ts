import { Router } from "express";
import { startSession, joinSession } from "../controllers/session.controller.js";
import { restrictToAuthenticatedUser, authenticationMiddleware } from "../middlewares/auth.middleware.js";

export const sessionRouter = Router();

sessionRouter.post("/", restrictToAuthenticatedUser(), startSession);

sessionRouter.post("/join", joinSession);
