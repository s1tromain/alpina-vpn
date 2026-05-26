import type { PrismaClient, OrderStatus, Prisma } from "@prisma/client";

const ORDER_INCLUDE = {
  user: true,
  plan: true,
  country: true,
} satisfies Prisma.OrderInclude;

/// Admin lists need receipt metadata so the moderation table can show a
/// "view receipt" affordance without a second round-trip per row. Only
/// summary fields — never the file blob — keeps the payload bounded.
const ORDER_INCLUDE_WITH_RECEIPTS = {
  ...ORDER_INCLUDE,
  receipts: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  },
} satisfies Prisma.OrderInclude;

export class OrdersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE_WITH_RECEIPTS,
    });
  }

  listForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: ORDER_INCLUDE_WITH_RECEIPTS,
    });
  }

  listForAdmin(params: { status?: OrderStatus; skip?: number; take?: number }) {
    const { status, skip = 0, take = 50 } = params;
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: ORDER_INCLUDE_WITH_RECEIPTS,
    });
  }

  create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({ data, include: ORDER_INCLUDE_WITH_RECEIPTS });
  }
}
