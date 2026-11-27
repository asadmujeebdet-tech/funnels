import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { resolve } from "node:path";
import { config } from "./config/env";
import { errorHandler } from "./middleware/errors";
import { analyticsRouter } from "./routes/analytics";
import { appsRouter } from "./routes/apps";
import { authRouter } from "./routes/auth";
import { featuresRouter } from "./routes/features";

export const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "4kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "funnels" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/apps", appsRouter);
app.use("/api/v1", featuresRouter);
app.use("/api/v1", analyticsRouter);

// In the single-service Render deployment, Express serves the Vite build.
// The process starts from the backend directory, so the frontend build is
// available one level up at ../frontend/dist.
const frontendDist = resolve(process.cwd(), "../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    next();
    return;
  }
  res.sendFile(resolve(frontendDist, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use(errorHandler);
