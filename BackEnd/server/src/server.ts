import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import exitHook from "async-exit-hook";
import cors from "cors";
import { connectDB, closeDB } from "./config/db";
import { env } from "./config/enviroment";
import RouterV1 from "./routes/v1/index";
import { errorHandler } from "~/middlewares/error.middleware";
import { registerExamSocket, restoreExamRuntimesOnStartup } from "~/socket/examSocket";
import { setupSwaggerDocs } from "./docs/swagger";
import { startExamDeadlineReminderScheduler } from "~/jobs/examDeadlineReminders.job";
import { startExamPreviewMediaCleanupScheduler } from "~/jobs/examPreviewMediaCleanup.job";
import { startExamScheduleScheduler } from "~/jobs/examScheduledRuntime.job";
import { runPendingMigrations } from "~/db/runMigrations";

const START_SERVER = () => {
  const app = express();
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json());

  setupSwaggerDocs(app);

  app.use("/v1", RouterV1);

  // Root healthcheck endpoint
  app.get("/", (req, res) => {
    res.json({ success: true, message: "API is running" });
  });

  app.use(errorHandler);

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });
  registerExamSocket(io);

  // Restore active exam runtimes from DB (survive server restart)
  void restoreExamRuntimesOnStartup(io);

  startExamDeadlineReminderScheduler();
  startExamPreviewMediaCleanupScheduler();
  startExamScheduleScheduler();

  httpServer.listen(Number(env.APP_PORT), () => {
    console.log(
      `Hi ${env.AUTHOR}, Back-end + Socket.IO at http://${env.APP_HOST}:${env.APP_PORT} (WS path /socket.io)`,
    );
  });

  exitHook(async () => {
    console.log("Server shutting down...");
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
    httpServer.close();
    await closeDB();
    console.log("PostgreSQL disconnected.");
  });
};

connectDB()
  .then(() => runPendingMigrations())
  .then(() => {
    console.log("Connected to PostgreSQL (Neon) successfully!");
    START_SERVER();
  })
  .catch((err) => {
    console.error("Cannot connect to PostgreSQL:", err);
    process.exit(1);
  });
