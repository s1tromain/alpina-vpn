import { z } from "zod";

export const createOrderSchema = z.object({
  planId: z.string().min(1),
  countryCode: z
    .string()
    .length(2, "countryCode must be ISO-3166 alpha-2")
    .toUpperCase(),
  requisiteId: z.string().min(1),
});
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

export const orderIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "processing",
    "approved",
    "rejected",
    "expired",
    "cancelled",
  ]),
  note: z.string().max(500).optional(),
  noteKey: z.enum(["paymentNotReceived", "cancelledByCustomer"]).optional(),
  paymentReference: z.string().max(200).optional(),
  paymentReferenceKey: z.enum(["awaitingOnChain"]).optional(),
});
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;

export const listOrdersQuerySchema = z.object({
  status: z
    .enum([
      "pending",
      "processing",
      "approved",
      "rejected",
      "expired",
      "cancelled",
    ])
    .optional(),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(200).default(50),
});
