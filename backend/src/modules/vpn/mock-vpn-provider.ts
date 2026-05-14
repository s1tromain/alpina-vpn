import crypto from "node:crypto";
import type { ProvisionInput, ProvisionResult, VpnProvider } from "./vpn-provider.js";

/**
 * Mock provider for the MVP. Returns deterministic, fake subscription URLs
 * so the Mini App QR/copy flows work end-to-end before Marzban is wired up.
 *
 * No external I/O — safe to use in CI and local dev.
 */
export class MockVpnProvider implements VpnProvider {
  readonly name = "mock" as const;

  async provision(input: ProvisionInput): Promise<ProvisionResult> {
    const expiresAt = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000);

    // Fake but stable-looking VLESS URL. Format mimics Reality so the
    // frontend's QR renderer has something realistic to display.
    const uuid = crypto.randomUUID();
    const host = `${input.countryCode.toLowerCase()}.alpinavpn.dev`;
    const subscriptionUrl =
      `vless://${uuid}@${host}:443` +
      `?encryption=none&security=reality&type=tcp&flow=xtls-rprx-vision` +
      `&sni=www.cloudflare.com&fp=chrome` +
      `#AlpinaVPN-${input.countryCode}-${input.planSlug}`;

    return {
      externalUserId: null,
      subscriptionUrl,
      expiresAt,
    };
  }

  async suspend(_externalUserId: string): Promise<void> {
    /* no-op in mock */
  }

  async resume(_externalUserId: string): Promise<void> {
    /* no-op in mock */
  }

  async revoke(_externalUserId: string): Promise<void> {
    /* no-op in mock */
  }
}
