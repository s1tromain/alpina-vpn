import type { ProvisionInput, ProvisionResult, VpnProvider } from "./vpn-provider.js";

/**
 * Marzban integration stub. Intentionally NOT implemented yet — present so
 * the wiring is in place and we can swap providers without touching the
 * services layer.
 *
 * When implementing, the following endpoints will be needed:
 *   POST /api/admin/token   (login → bearer)
 *   POST /api/user          (create user with proxies/inbounds)
 *   GET  /api/user/{name}   (read; expose `subscription_url`)
 *   PUT  /api/user/{name}   (update status: active/disabled/limited)
 *   DELETE /api/user/{name} (revoke)
 *
 * Reference: https://github.com/Gozargah/Marzban
 */
export interface MarzbanConfig {
  apiUrl: string;
  username: string;
  password: string;
}

export class MarzbanVpnProvider implements VpnProvider {
  readonly name = "marzban" as const;

  constructor(private readonly cfg: MarzbanConfig) {}

  async provision(_input: ProvisionInput): Promise<ProvisionResult> {
    throw new Error("MarzbanVpnProvider.provision is not implemented yet");
  }

  async suspend(_externalUserId: string): Promise<void> {
    throw new Error("MarzbanVpnProvider.suspend is not implemented yet");
  }

  async resume(_externalUserId: string): Promise<void> {
    throw new Error("MarzbanVpnProvider.resume is not implemented yet");
  }

  async revoke(_externalUserId: string): Promise<void> {
    throw new Error("MarzbanVpnProvider.revoke is not implemented yet");
  }
}
