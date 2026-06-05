import { z } from "zod";

export const telegramLoginSchema = z.object({
  initData: z.string().min(1),
});
export type TelegramLoginDto = z.infer<typeof telegramLoginSchema>;

export const adminLoginSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});
export type AdminLoginDto = z.infer<typeof adminLoginSchema>;
