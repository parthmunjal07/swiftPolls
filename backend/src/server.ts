import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import pollRouter  from "./routes/poll.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { responseRouter } from "./routes/response.routes.js";
import { sessionRouter } from "./routes/session.routes.js";
import { authenticationMiddleware } from "./middlewares/auth.middleware.js";
import { registerSocketHandlers } from "./sockets/index.js";
import "./jobs/workers.js";
import { initRepeatableJobs } from "./jobs/queues.js";
import { setIO } from "./sockets/io.js";

const app = express();
const httpServer = createServer(app);


export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
setIO(io)

registerSocketHandlers(io);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json());
app.use(cookieParser());


app.use(authenticationMiddleware());


app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/polls", pollRouter);
app.use("/api/responses", responseRouter);
app.use("/api/sessions", sessionRouter);
app.use("/api/analytics", analyticsRouter);


app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
);

const port = process.env.PORT || 8079;

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`WebSocket server ready`);
  initRepeatableJobs().catch(console.error);
});