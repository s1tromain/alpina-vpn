import { z } from "zod";

export const telegramLoginSchema = z.object({
  initData: z.string().min(1),
});
export type TelegramLoginDto = z.infer<typeof telegramLoginSchema>;
