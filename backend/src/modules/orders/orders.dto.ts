import { z } from "zod";

// The checkout no longer asks for a country or a requisite — the backend
// pins the order to the configured default region and the single active
// payment card. Only the plan is chosen by the user.
export const createOrderSchema = z.object({
  planId: z.string().min(1),
});
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

export const orderIdParamsSchema = z.object({
  id: z.string().min(1),
});

const ORDER_STATUS_VALUES = [
  "created",
  "pending",
  "processing",
  "approved",
  "rejected",
  "active",
  "expired",
  "cancelled",
] as const;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
  note: z.string().max(500).optional(),
  noteKey: z.enum(["paymentNotReceived", "cancelledByCustomer"]).optional(),
  paymentReference: z.string().max(200).optional(),
  paymentReferenceKey: z.enum(["awaitingOnChain"]).optional(),
});
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES).optional(),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(200).default(50),
});
