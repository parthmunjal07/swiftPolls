import { Router } from "express";
import passport from "passport";
import { signup, login, me, googleCallback } from "../controllers/auth.controller.js";
import { authenticationMiddleware, restrictToAuthenticatedUser } from "../middlewares/auth.middleware.js";
import "../utils/passport.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.get("/me", authenticationMiddleware(), restrictToAuthenticatedUser(), me);

authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { 
    session: false, 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` 
  }),
  googleCallback
);

export default authRouter;