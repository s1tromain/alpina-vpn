import fp from "fastify-plugin";
import { prisma } from "../lib/prisma.js";

/**
 * Expose `app.prisma` and gracefully disconnect on close.
 * We do NOT call $connect() up-front — Prisma handles lazy connection.
 */
export const prismaPlugin = fp(async (app) => {
  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
