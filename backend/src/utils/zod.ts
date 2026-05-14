import type { FastifyRequest } from "fastify";
import type { ZodSchema, ZodTypeAny } from "zod";
import { ValidationError } from "../lib/errors.js";

/** Parse a Zod schema against an arbitrary payload, throwing ValidationError on failure. */
export function parseOrThrow<T extends ZodTypeAny>(schema: T, value: unknown): T["_output"] {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError("Invalid payload", result.error.flatten());
  }
  return result.data;
}

/** Convenience helpers to validate request parts. */
export const validateBody = <T extends ZodSchema>(req: FastifyRequest, schema: T) =>
  parseOrThrow(schema, req.body);

export const validateQuery = <T extends ZodSchema>(req: FastifyRequest, schema: T) =>
  parseOrThrow(schema, req.query);

export const validateParams = <T extends ZodSchema>(req: FastifyRequest, schema: T) =>
  parseOrThrow(schema, req.params);
