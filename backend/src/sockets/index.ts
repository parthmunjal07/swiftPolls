import { Server, Socket } from "socket.io";
import { db } from "../db/index.js";
import { sessions } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const registerSocketHandlers = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Audience & Host join a session room
    socket.on("join_room", (room_code: string) => {
      if (!room_code) return;
      socket.join(room_code);
      console.log(`Socket ${socket.id} joined room ${room_code}`);
    });

    // --- Host Controls ---

    socket.on("next_question", async ({ room_code, new_index }) => {
      try {
        await db
          .update(sessions)
          .set({ current_question_index: new_index })
          .where(eq(sessions.room_code, room_code));

        io.to(room_code).emit("question_changed", { current_question_index: new_index });
      } catch (error) {
        console.error("Error on next_question:", error);
      }
    });

    socket.on("prev_question", async ({ room_code, new_index }) => {
      try {
        await db
          .update(sessions)
          .set({ current_question_index: new_index })
          .where(eq(sessions.room_code, room_code));

        io.to(room_code).emit("question_changed", { current_question_index: new_index });
      } catch (error) {
        console.error("Error on prev_question:", error);
      }
    });

    socket.on("open_answers", ({ room_code }) => {
      io.to(room_code).emit("answers_opened");
    });

    socket.on("close_answers", ({ room_code }) => {
      io.to(room_code).emit("answers_closed");
    });

    socket.on("set_results_visible", async ({ room_code, visible }) => {
      try {
        await db
          .update(sessions)
          .set({ results_visible: visible })
          .where(eq(sessions.room_code, room_code));

        io.to(room_code).emit("results_visible_changed", { visible });
      } catch (error) {
        console.error("Error on set_results_visible:", error);
      }
    });

    socket.on("end_session", async ({ room_code }) => {
      try {
        await db
          .update(sessions)
          .set({ status: "ended", ended_at: new Date() })
          .where(eq(sessions.room_code, room_code));

        io.to(room_code).emit("session_ended");
      } catch (error) {
        console.error("Error on end_session:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
