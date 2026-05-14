import fp from "fastify-plugin";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { isProd } from "../config/env.js";

/**
 * Single setErrorHandler. Maps domain errors, Zod errors, and Prisma errors
 * to consistent JSON responses. Never leaks stack traces in production.
 */
export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, "request_error");

    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: err.code,
        message: err.message,
        details: err.details,
      });
    }

    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid payload",
        details: err.flatten(),
      });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return reply
          .status(404)
          .send({ error: "NOT_FOUND", message: "Resource not found" });
      }
      if (err.code === "P2002") {
        return reply
          .status(409)
          .send({ error: "CONFLICT", message: "Unique constraint violation" });
      }
    }

    // @fastify/rate-limit attaches statusCode=429 to its error
    if ((err as { statusCode?: number }).statusCode === 429) {
      return reply.status(429).send({
        error: "RATE_LIMITED",
        message: "Too many requests",
      });
    }

    // Fastify's own validation errors (schema-driven, if used) come with `validation`.
    if ((err as { validation?: unknown }).validation) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: err.message,
        details: (err as { validation: unknown }).validation,
      });
    }

    return reply.status(500).send({
      error: "INTERNAL_ERROR",
      message: isProd ? "Internal server error" : err.message,
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ error: "NOT_FOUND", message: "Route not found" });
  });
});
