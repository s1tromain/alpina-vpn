import "fastify";
import type { UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: import("fastify").preHandlerAsyncHookHandler;
    requireRole: (
      ...roles: UserRole[]
    ) => import("fastify").preHandlerAsyncHookHandler;
  }

  interface FastifyRequest {
    /** Populated by the `authenticate` preHandler. */
    user?: AuthenticatedUser;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; tg: string; role: UserRole };
    user: AuthenticatedUser;
  }
}

export interface AuthenticatedUser {
  id: string;
  telegramId: string;
  role: UserRole;
}
