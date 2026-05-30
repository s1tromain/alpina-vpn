import { z } from "zod";

// Admin-facing plan shape. Traffic is expressed in GB at the API boundary
// (null = unlimited) and converted to bytes by the service before storage.
export const createPlanSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric/hyphen"),
  tier: z.enum(["starter", "standard", "premium"]),
  label: z.string().min(1).max(60),
  priceUsd: z.number().nonnegative(),
  durationDays: z.number().int().positive().max(3650).default(30),
  trafficGb: z.number().positive().nullable().default(null),
  maxDevices: z.number().int().positive().max(100).default(3),
  features: z.array(z.string().max(120)).default([]),
  badge: z.string().max(40).nullable().optional(),
  savingsPercent: z.number().int().min(0).max(100).nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type CreatePlanDto = z.infer<typeof createPlanSchema>;

export const planIdSchema = z.object({ id: z.string().min(1) });

export const updatePlanSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(40)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    tier: z.enum(["starter", "standard", "premium"]).optional(),
    label: z.string().min(1).max(60).optional(),
    priceUsd: z.number().nonnegative().optional(),
    durationDays: z.number().int().positive().max(3650).optional(),
    trafficGb: z.number().positive().nullable().optional(),
    maxDevices: z.number().int().positive().max(100).optional(),
    features: z.array(z.string().max(120)).optional(),
    badge: z.string().max(40).nullable().optional(),
    savingsPercent: z.number().int().min(0).max(100).nullable().optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;
