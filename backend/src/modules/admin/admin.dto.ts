import { z } from "zod";

export const adminListUsersQuerySchema = z.object({
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().max(100).optional(),
});

export const setUserRoleSchema = z.object({
  role: z.enum(["user", "operator", "admin"]),
});

export const setUserBanSchema = z.object({
  banned: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const userIdParamsSchema = z.object({ id: z.string().min(1) });
