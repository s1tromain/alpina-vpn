import type { PrismaClient, Prisma } from "@prisma/client";

export class RequisitesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listActive() {
    return this.prisma.paymentRequisite.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  listAll() {
    return this.prisma.paymentRequisite.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  create(data: Prisma.PaymentRequisiteCreateInput) {
    return this.prisma.paymentRequisite.create({ data });
  }

  softDelete(id: string) {
    return this.prisma.paymentRequisite.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  }

  update(id: string, data: Prisma.PaymentRequisiteUpdateInput) {
    return this.prisma.paymentRequisite.update({ where: { id }, data });
  }

  findById(id: string) {
    return this.prisma.paymentRequisite.findUnique({ where: { id } });
  }
}
