import type {
  Country,
  Order,
  PaymentRequisite,
  Plan,
  Subscription,
  User,
  VpnServer,
} from "@prisma/client";

/**
 * DTOs match the *exact* shape the existing Next.js frontend expects
 * (see frontend `src/types/index.ts`). Renaming a field here will break
 * the Mini App — coordinate any change with the frontend types file.
 */

export interface UserDto {
  id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  isPremium: boolean;
  role: "user" | "operator" | "admin";
  registeredAt: string;
  lastSeenAt?: string;
  subscription: SubscriptionDto | null;
}

export interface PlanDto {
  id: string;
  duration: "1m" | "3m" | "6m" | "12m";
  label: string;
  priceUsd: number;
  monthlyEquivalent: number;
  maxDevices: number;
  trafficLimit: number | null;
  badge?: string;
  savingsPercent?: number;
  features: string[];
}

export interface CountryDto {
  code: string;
  name: string;
  flag: string;
  ping: number;
  load: number;
  premium?: boolean;
}

export interface SubscriptionDto {
  id: string;
  userId: string;
  plan: PlanDto;
  country: CountryDto;
  status: "active" | "expired" | "paused" | "none";
  startedAt: string;
  expiresAt: string;
  subscriptionUrl: string;
  maxDevices: number;
  activeDevices: number;
  trafficLimit: number | null;
  trafficUsed: number;
  autoRenew: boolean;
}

export interface OrderDto {
  id: string;
  userId: string;
  username: string;
  planId: string;
  planLabel: string;
  countryCode: string;
  countryName: string;
  amount: number;
  currency: string;
  status:
    | "pending"
    | "processing"
    | "approved"
    | "rejected"
    | "expired"
    | "cancelled";
  createdAt: string;
  reviewedAt?: string;
  expiresAt?: string;
  paymentRequisiteId: string;
  paymentReference?: string;
  paymentReferenceKey?: string;
  note?: string;
  noteKey?: string;
}

export interface PaymentRequisiteDto {
  id: string;
  method: "card" | "crypto" | "bank";
  label: string;
  address: string;
  currency: string;
  network?: string;
  active: boolean;
  receivedTotalUsd?: number;
}

export interface VpnServerDto {
  id: string;
  country: string;
  countryCode: string;
  city: string;
  flag: string;
  status: "online" | "offline" | "maintenance";
  load: number;
  ping: number;
  bandwidth: number;
  protocol: "Reality" | "VLESS" | "WireGuard";
  premium?: boolean;
}

// ───────────────────────── mappers ─────────────────────────

function planDurationToSlug(d: Plan["duration"]): PlanDto["duration"] {
  switch (d) {
    case "m1":
      return "1m";
    case "m3":
      return "3m";
    case "m6":
      return "6m";
    case "m12":
      return "12m";
  }
}

export function toPlanDto(plan: Plan): PlanDto {
  return {
    id: plan.id,
    duration: planDurationToSlug(plan.duration),
    label: plan.label,
    priceUsd: Number(plan.priceUsd),
    monthlyEquivalent: Number(plan.monthlyEquivalent),
    maxDevices: plan.maxDevices,
    trafficLimit: plan.trafficLimit === null ? null : Number(plan.trafficLimit),
    badge: plan.badge ?? undefined,
    savingsPercent: plan.savingsPercent ?? undefined,
    features: plan.features,
  };
}

export function toCountryDto(country: Country): CountryDto {
  return {
    code: country.code,
    name: country.name,
    flag: country.flag,
    ping: country.ping,
    load: country.load,
    premium: country.premium || undefined,
  };
}

export function toSubscriptionDto(
  sub: Subscription & { plan: Plan; country: Country },
): SubscriptionDto {
  return {
    id: sub.id,
    userId: sub.userId,
    plan: toPlanDto(sub.plan),
    country: toCountryDto(sub.country),
    status: sub.status === "suspended" ? "paused" : sub.status,
    startedAt: sub.startedAt.toISOString(),
    expiresAt: sub.expiresAt.toISOString(),
    subscriptionUrl: sub.subscriptionUrl,
    maxDevices: sub.maxDevices,
    activeDevices: sub.activeDevices,
    trafficLimit: sub.trafficLimit === null ? null : Number(sub.trafficLimit),
    trafficUsed: Number(sub.trafficUsed),
    autoRenew: sub.autoRenew,
  };
}

export interface UserWithSubscription extends User {
  subscriptions: (Subscription & { plan: Plan; country: Country })[];
}

export function toUserDto(user: UserWithSubscription): UserDto {
  // The "current" subscription is the most recent active or paused one.
  const current =
    user.subscriptions.find((s) => s.status === "active") ??
    user.subscriptions.find((s) => s.status === "suspended") ??
    null;

  return {
    id: user.id,
    telegramId: Number(user.telegramId),
    username: user.username ?? "",
    firstName: user.firstName,
    lastName: user.lastName ?? undefined,
    photoUrl: user.photoUrl ?? undefined,
    isPremium: user.isPremium,
    role: user.role,
    registeredAt: user.registeredAt.toISOString(),
    lastSeenAt: user.lastSeenAt?.toISOString(),
    subscription: current ? toSubscriptionDto(current) : null,
  };
}

export interface OrderWithRelations extends Order {
  user: User;
  plan: Plan;
  country: Country;
}

export function toOrderDto(order: OrderWithRelations): OrderDto {
  return {
    id: order.id,
    userId: order.userId,
    username: order.user.username ?? order.user.firstName,
    planId: order.planId,
    planLabel: order.plan.label,
    countryCode: order.countryCode,
    countryName: order.country.name,
    amount: Number(order.amount),
    currency: order.currency,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    reviewedAt: order.reviewedAt?.toISOString(),
    expiresAt: order.expiresAt?.toISOString(),
    paymentRequisiteId: order.paymentRequisiteId,
    paymentReference: order.paymentReference ?? undefined,
    paymentReferenceKey: order.paymentReferenceKey ?? undefined,
    note: order.note ?? undefined,
    noteKey: order.noteKey ?? undefined,
  };
}

export function toRequisiteDto(
  r: PaymentRequisite,
  opts: { includeTotals: boolean } = { includeTotals: false },
): PaymentRequisiteDto {
  return {
    id: r.id,
    method: r.method,
    label: r.label,
    address: r.address,
    currency: r.currency,
    network: r.network ?? undefined,
    active: r.active,
    ...(opts.includeTotals
      ? { receivedTotalUsd: Number(r.receivedTotalUsd) }
      : {}),
  };
}

export function toServerDto(
  server: VpnServer & { country: Country },
): VpnServerDto {
  return {
    id: server.id,
    country: server.country.name,
    countryCode: server.countryCode,
    city: server.city,
    flag: server.country.flag,
    status: server.status,
    load: server.load,
    ping: server.ping,
    bandwidth: server.bandwidth,
    protocol: server.protocol,
    premium: server.premium || undefined,
  };
}
