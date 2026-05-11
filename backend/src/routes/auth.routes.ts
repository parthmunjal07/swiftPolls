import { Router } from "express";
import passport from "passport";
import { signup, login, me, googleCallback } from "../controllers/auth.controller.js";
import { authenticationMiddleware, restrictToAuthenticatedUser } from "../middlewares/auth.middleware.js";
import "../utils/passport.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authenticationMiddleware(), restrictToAuthenticatedUser(), me);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { 
    session: false, 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` 
  }),
  googleCallback
);

export default router;