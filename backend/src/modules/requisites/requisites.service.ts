import type { PrismaClient } from "@prisma/client";
import { NotFoundError, UnprocessableError } from "../../lib/errors.js";
import { RequisitesRepository } from "./requisites.repository.js";
import type { CreateRequisiteDto, UpdateRequisiteDto } from "./requisites.dto.js";

export class RequisitesService {
  private readonly repo: RequisitesRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new RequisitesRepository(prisma);
  }

  listActive() {
    return this.repo.listActive();
  }

  listAll() {
    return this.repo.listAll();
  }

  async getById(id: string) {
    const found = await this.repo.findById(id);
    if (!found || found.deletedAt) throw new NotFoundError("PaymentRequisite", id);
    return found;
  }

  create(dto: CreateRequisiteDto) {
    return this.repo.create({
      method: dto.method,
      label: dto.label,
      address: dto.address,
      currency: dto.currency,
      network: dto.network ?? null,
      active: dto.active,
    });
  }

  /**
   * Generic partial update. Used by the admin panel both for label/address
   * edits AND as the activate/deactivate toggle (PATCH with `{ active }`).
   * Refuses to operate on soft-deleted rows. Update + audit row commit in
   * a single transaction so the audit log can't go out of sync.
   */
  async update(id: string, dto: UpdateRequisiteDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.paymentRequisite.findUnique({ where: { id } });
      if (!found || found.deletedAt) {
        throw new NotFoundError("PaymentRequisite", id);
      }
      const before = { active: found.active };
      const updated = await tx.paymentRequisite.update({ where: { id }, data: dto });

      if (dto.active !== undefined && dto.active !== before.active) {
        await tx.adminAction.create({
          data: {
            actorId,
            kind: dto.active ? "requisite_create" : "requisite_disable",
            targetType: "requisite",
            targetId: id,
            metadata: { active: { from: before.active, to: dto.active } },
          },
        });
      }
      return updated;
    });
  }

  /**
   * Soft-delete. Refuses if any open order still references the requisite
   * (operator would yank the only payment route out from under a user
   * mid-checkout). The pre-flight count and the soft-delete happen in a
   * single transaction so we don't race with a fresh order coming in.
   */
  async remove(id: string, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      const found = await tx.paymentRequisite.findUnique({ where: { id } });
      if (!found || found.deletedAt) {
        throw new NotFoundError("PaymentRequisite", id);
      }

      const openOrders = await tx.order.count({
        where: {
          paymentRequisiteId: id,
          status: { in: ["pending", "processing"] },
        },
      });
      if (openOrders > 0) {
        throw new UnprocessableError(
          `Cannot delete a requisite with ${openOrders} open order(s) — deactivate first`,
        );
      }

      await tx.paymentRequisite.update({
        where: { id },
        data: { active: false, deletedAt: new Date() },
      });
      await tx.adminAction.create({
        data: {
          actorId,
          kind: "requisite_delete",
          targetType: "requisite",
          targetId: id,
        },
      });
    });
  }
}
