import { Router } from "express";
import {
  createPoll,
  getMyPolls,
  getPollById,
  getPollBySlug,
  updatePoll,
  deletePoll,
  publishPoll,
} from "../controllers/polls.controller.js";
import { restrictToAuthenticatedUser } from "../middlewares/auth.middleware.js";

const pollRouter = Router();

pollRouter.post("/", restrictToAuthenticatedUser(), createPoll);
pollRouter.get("/", restrictToAuthenticatedUser(), getMyPolls);
pollRouter.get("/:id", restrictToAuthenticatedUser(), getPollById);
pollRouter.patch("/:id", restrictToAuthenticatedUser(), updatePoll);
pollRouter.delete("/:id", restrictToAuthenticatedUser(), deletePoll);
pollRouter.patch("/:id/publish", restrictToAuthenticatedUser(), publishPoll);

pollRouter.get("/slug/:slug", getPollBySlug);

export default pollRouter;