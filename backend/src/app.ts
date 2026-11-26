import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config/env";
import { errorHandler } from "./middleware/errors";
import { analyticsRouter } from "./routes/analytics";
import { appsRouter } from "./routes/apps";
import { authRouter } from "./routes/auth";
import { featuresRouter } from "./routes/features";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ga4-feature-journey-analyzer-api" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/apps", appsRouter);
app.use("/api/v1", featuresRouter);
app.use("/api/v1", analyticsRouter);
app.use(errorHandler);
