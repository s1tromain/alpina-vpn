import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { NotificationsService } from "./notifications.service.js";
import { validateParams } from "../../utils/zod.js";

const notificationIdSchema = z.object({ id: z.string().min(1) });

export const notificationsRoutes: FastifyPluginAsync = async (app) => {
  const notifications = new NotificationsService(app.prisma);
  app.addHook("preHandler", app.authenticate);

  app.get("/notifications", async (req) => {
    return notifications.listForUser(req.user!.id);
  });

  app.get("/notifications/unread-count", async (req) => {
    const count = await notifications.countUnread(req.user!.id);
    return { count };
  });

  app.post("/notifications/read-all", async (req) => {
    const result = await notifications.markAllRead(req.user!.id);
    return { ok: true, updated: result.count };
  });

  app.post("/notifications/:id/read", async (req) => {
    const { id } = validateParams(req, notificationIdSchema);
    const result = await notifications.markRead(id, req.user!.id);
    return { ok: true, updated: result.count };
  });
};
