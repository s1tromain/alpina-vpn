import type { PrismaClient, Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import type { CreatePlanDto, UpdatePlanDto } from "./plans.dto.js";

const BYTES_PER_GB = 1024n * 1024n * 1024n;

function gbToBytes(gb: number | null | undefined): bigint | null {
  if (gb === null || gb === undefined) return null;
  // Round to the nearest byte; GB values are small enough for safe math.
  return BigInt(Math.round(gb * Number(BYTES_PER_GB)));
}

/**
 * Admin CRUD over subscription plans (tiers). The public catalogue read lives
 * in `catalog.routes.ts`; this service is the write side used by the admin
 * panel. Traffic is exposed in GB at the boundary and stored as bytes.
 */
export class PlansService {
  constructor(private readonly prisma: PrismaClient) {}

  /** All plans incl. inactive, display order — used by the admin grid. */
  listAll() {
    return this.prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async create(dto: CreatePlanDto) {
    const clash = await this.prisma.plan.findUnique({ where: { slug: dto.slug } });
    if (clash) throw new ConflictError(`A plan with slug "${dto.slug}" already exists`);

    return this.prisma.plan.create({
      data: {
        slug: dto.slug,
        tier: dto.tier,
        label: dto.label,
        priceUsd: dto.priceUsd.toFixed(2),
        durationDays: dto.durationDays,
        trafficLimit: gbToBytes(dto.trafficGb),
        maxDevices: dto.maxDevices,
        features: dto.features,
        badge: dto.badge ?? null,
        savingsPercent: dto.savingsPercent ?? null,
        active: dto.active,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async update(id: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.plan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Plan", id);

    if (dto.slug && dto.slug !== existing.slug) {
      const clash = await this.prisma.plan.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new ConflictError(`A plan with slug "${dto.slug}" already exists`);
    }

    const data: Prisma.PlanUpdateInput = {
      ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
      ...(dto.tier !== undefined ? { tier: dto.tier } : {}),
      ...(dto.label !== undefined ? { label: dto.label } : {}),
      ...(dto.priceUsd !== undefined ? { priceUsd: dto.priceUsd.toFixed(2) } : {}),
      ...(dto.durationDays !== undefined ? { durationDays: dto.durationDays } : {}),
      ...(dto.trafficGb !== undefined ? { trafficLimit: gbToBytes(dto.trafficGb) } : {}),
      ...(dto.maxDevices !== undefined ? { maxDevices: dto.maxDevices } : {}),
      ...(dto.features !== undefined ? { features: dto.features } : {}),
      ...(dto.badge !== undefined ? { badge: dto.badge } : {}),
      ...(dto.savingsPercent !== undefined ? { savingsPercent: dto.savingsPercent } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    };

    return this.prisma.plan.update({ where: { id }, data });
  }
}
