import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: error.flatten() });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({ error: message });
};
