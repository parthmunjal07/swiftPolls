import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { generateTokens, setRefreshCookie } from "../utils/jwt.js";

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email is already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwd_hash: hashedPassword,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
      });

    if (!newUser) {
      return res.status(500).json({ message: "Failed to create user" });
    }

    const { accessToken, refreshToken } = generateTokens(newUser.id);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      message: "Account created successfully",
      accessToken,
      user: newUser,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwd_hash || "");
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    setRefreshCookie(res, refreshToken);

    const { passwd_hash, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: "Logged in successfully",
      accessToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Me route error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    const user = req.user as any; 

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    setRefreshCookie(res, refreshToken);

    res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${accessToken}`);
  } catch (error) {
    console.error("Google Auth error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};
