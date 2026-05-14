/**
 * Provider-agnostic interface for the VPN backend. The order/subscription
 * services depend on this — they never call Marzban directly.
 *
 * MVP ships with `MockVpnProvider`; swap to `MarzbanVpnProvider` once the
 * Marzban node is live by changing VPN_PROVIDER=marzban. No service code
 * should change.
 */

export interface ProvisionInput {
  userId: string;
  telegramId: string;
  planSlug: string;
  countryCode: string;
  durationDays: number;
  /** bytes per period; null = unlimited */
  trafficLimitBytes: bigint | null;
  maxDevices: number;
}

export interface ProvisionResult {
  /** Opaque external user id (Marzban username) — null for mock. */
  externalUserId: string | null;
  /** URL the Mini App hands to the user; vless://… or similar. */
  subscriptionUrl: string;
  /** ISO string when the underlying provider considers this user expired. */
  expiresAt: Date;
}

export interface VpnProvider {
  readonly name: "mock" | "marzban";

  /** Create a VPN user. Idempotent on (userId, planSlug). */
  provision(input: ProvisionInput): Promise<ProvisionResult>;

  /** Disable a previously-provisioned subscription. */
  suspend(externalUserId: string): Promise<void>;

  /** Re-enable a suspended subscription. */
  resume(externalUserId: string): Promise<void>;

  /** Delete the upstream user record entirely. */
  revoke(externalUserId: string): Promise<void>;
}
