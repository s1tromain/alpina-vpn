import type { PrismaClient } from "@prisma/client";

/**
 * Thin data-access wrapper around Prisma. Keeps query shapes consistent
 * between services and easy to mock in tests.
 */
export class UsersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          where: { status: { in: ["active", "suspended"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: true, country: true },
        },
      },
    });
  }

  findByTelegramId(telegramId: bigint) {
    return this.prisma.user.findUnique({ where: { telegramId } });
  }

  listForAdmin(params: { skip?: number; take?: number; search?: string }) {
    const { skip = 0, take = 50, search } = params;
    return this.prisma.user.findMany({
      skip,
      take: Math.min(take, 200),
      where: search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { registeredAt: "desc" },
      include: {
        subscriptions: {
          where: { status: { in: ["active", "suspended"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: true, country: true },
        },
      },
    });
  }
}
