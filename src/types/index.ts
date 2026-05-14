export type UserRole = "admin" | "operator" | "user";

export type OrderStatus =
  | "pending"
  | "processing"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type SubscriptionStatus = "active" | "expired" | "paused" | "none";

export type PlanDuration = "1m" | "3m" | "6m" | "12m";

export type ServerStatus = "online" | "offline" | "maintenance";

/** Translation keys for canned order notes (operator/system-generated). */
export type OrderNoteKey = "paymentNotReceived" | "cancelledByCustomer";

/** Translation keys for canned payment-reference statuses. Real
 *  transaction hashes / IDs go in `paymentReference` as a raw string. */
export type PaymentRefKey = "awaitingOnChain";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface User {
  id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  isPremium: boolean;
  role: UserRole;
  registeredAt: string;
  lastSeenAt?: string;
  subscription: Subscription | null;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  country: Country;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  subscriptionUrl: string;
  maxDevices: number;
  activeDevices: number;
  /** bytes, null = unlimited */
  trafficLimit: number | null;
  /** bytes consumed in current period */
  trafficUsed: number;
  autoRenew: boolean;
}

export interface Plan {
  id: string;
  duration: PlanDuration;
  label: string;
  priceUsd: number;
  monthlyEquivalent: number;
  maxDevices: number;
  /** bytes per month, null = unlimited */
  trafficLimit: number | null;
  badge?: string;
  savingsPercent?: number;
  features: string[];
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  ping: number;
  load: number;
  premium?: boolean;
}

export interface VPNServer {
  id: string;
  country: string;
  countryCode: string;
  city: string;
  flag: string;
  status: ServerStatus;
  /** 0–100 */
  load: number;
  ping: number;
  /** Mbps */
  bandwidth: number;
  protocol: "Reality" | "VLESS" | "WireGuard";
  premium?: boolean;
}

export interface PaymentRequisite {
  id: string;
  method: "card" | "crypto" | "bank";
  label: string;
  address: string;
  currency: string;
  network?: string;
  active: boolean;
  /** for admin only */
  receivedTotalUsd?: number;
}

export interface Order {
  id: string;
  userId: string;
  username: string;
  planId: string;
  planLabel: string;
  countryCode: string;
  countryName: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  reviewedAt?: string;
  expiresAt?: string;
  paymentRequisiteId: string;
  /** Raw reference (e.g. TX hash). Free-form, NOT translated. */
  paymentReference?: string;
  /** Canned reference key, resolved via `t.paymentReferences[key]`. */
  paymentReferenceKey?: PaymentRefKey;
  /** Free-form operator note. Falls back when `noteKey` is absent. */
  note?: string;
  /** Canned note key, resolved via `t.orderNotes[key]`. */
  noteKey?: OrderNoteKey;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  revenueUsd: number;
  revenueDeltaPct: number;
  approvedPayments: number;
  rejectedPayments: number;
  pendingPayments: number;
  serversOnline: number;
  serversTotal: number;
}

export interface RevenuePoint {
  date: string;
  amount: number;
}
