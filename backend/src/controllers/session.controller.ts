import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import crypto from "crypto";
import { db } from "../db/index.js";
import { polls, sessions, session_participants } from "../db/schema.js";
import { startSessionSchema } from "../validations/poll.validate.js";
import { joinSessionSchema } from "../validations/response.validate.js";

const generateRoomCode = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

export const startSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = startSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const { poll_id } = parsed.data;

    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, poll_id), eq(polls.user_id, userId)))
      .limit(1);

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    if (poll.mode !== "live") {
      return res.status(400).json({ message: "Can only start sessions for live polls" });
    }

    // Check if there is already an active session
    const [existingSession] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.poll_id, poll_id), eq(sessions.status, "active")))
      .limit(1);

    if (existingSession) {
      return res.status(409).json({ message: "An active session already exists for this poll", session: existingSession });
    }

    // Create a new session
    const room_code = generateRoomCode();
    
    const [newSession] = await db
      .insert(sessions)
      .values({
        poll_id,
        host_id: userId,
        room_code,
        status: "waiting",
        current_question_index: 0,
        results_visible: false,
        started_at: new Date(),
        created_at: new Date(),
      })
      .returning();

    return res.status(201).json({
      message: "Session created successfully",
      session: newSession,
    });
  } catch (error) {
    console.error("startSession error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const joinSession = async (req: Request, res: Response) => {
  try {
    const parsed = joinSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const { room_code, display_name } = parsed.data;

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.room_code, room_code))
      .limit(1);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status === "ended") {
      return res.status(410).json({ message: "This session has ended" });
    }

    const userId = req.user?.id || null;

    const [participant] = await db
      .insert(session_participants)
      .values({
        session_id: session.id,
        user_id: userId,
        display_name: display_name || "Anonymous",
        joined_at: new Date(),
      })
      .returning();

    // Issue a session token for the client to use when submitting answers
    const session_token = crypto.randomUUID();

    return res.status(200).json({
      message: "Joined session successfully",
      session,
      participant,
      session_token,
    });
  } catch (error) {
    console.error("joinSession error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
