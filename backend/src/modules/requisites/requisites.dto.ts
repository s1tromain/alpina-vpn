import { z } from "zod";

export const createRequisiteSchema = z.object({
  method: z.enum(["card", "crypto", "bank"]),
  label: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  currency: z.string().min(1).max(20),
  network: z.string().max(50).optional(),
  active: z.boolean().default(true),
});
export type CreateRequisiteDto = z.infer<typeof createRequisiteSchema>;

export const requisiteIdSchema = z.object({ id: z.string().min(1) });

export const updateRequisiteSchema = z
  .object({
    active: z.boolean().optional(),
    label: z.string().min(1).max(100).optional(),
    address: z.string().min(1).max(200).optional(),
    currency: z.string().min(1).max(20).optional(),
    network: z.string().max(50).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateRequisiteDto = z.infer<typeof updateRequisiteSchema>;
