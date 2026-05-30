import { z } from "zod";

// QR payload accepts either an absolute http(s) URL or a data: URL (the admin
// UI converts an uploaded image to a data URL client-side). Capped so a stray
// multi-MB data URL can't bloat the row.
const qrImageSchema = z
  .string()
  .max(1_000_000)
  .refine(
    (v) => /^https?:\/\//i.test(v) || /^data:image\//i.test(v),
    "qrImage must be an http(s) URL or a data:image/ URL",
  );

export const createRequisiteSchema = z.object({
  title: z.string().min(1).max(120),
  cardNumber: z.string().min(1).max(40),
  ownerName: z.string().min(1).max(120),
  bankName: z.string().min(1).max(120),
  qrImage: qrImageSchema.optional(),
  instructions: z.string().max(2000).optional(),
  active: z.boolean().default(true),
});
export type CreateRequisiteDto = z.infer<typeof createRequisiteSchema>;

export const requisiteIdSchema = z.object({ id: z.string().min(1) });

export const updateRequisiteSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    cardNumber: z.string().min(1).max(40).optional(),
    ownerName: z.string().min(1).max(120).optional(),
    bankName: z.string().min(1).max(120).optional(),
    qrImage: qrImageSchema.nullable().optional(),
    instructions: z.string().max(2000).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateRequisiteDto = z.infer<typeof updateRequisiteSchema>;
