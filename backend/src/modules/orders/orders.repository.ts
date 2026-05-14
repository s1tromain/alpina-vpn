import type { PrismaClient, OrderStatus, Prisma } from "@prisma/client";

const ORDER_INCLUDE = {
  user: true,
  plan: true,
  country: true,
} satisfies Prisma.OrderInclude;

export class OrdersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
  }

  listForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: ORDER_INCLUDE,
    });
  }

  listForAdmin(params: { status?: OrderStatus; skip?: number; take?: number }) {
    const { status, skip = 0, take = 50 } = params;
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: ORDER_INCLUDE,
    });
  }

  create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({ data, include: ORDER_INCLUDE });
  }
}
