import { env } from "../../config/env.js";
import { MockVpnProvider } from "./mock-vpn-provider.js";
import { MarzbanVpnProvider } from "./marzban-vpn-provider.js";
import type { VpnProvider } from "./vpn-provider.js";

/**
 * Process-wide singleton selected by VPN_PROVIDER env. Imports from this
 * module are the *only* way the rest of the code touches the VPN layer.
 */
let provider: VpnProvider | null = null;

export function getVpnProvider(): VpnProvider {
  if (provider) return provider;

  if (env.VPN_PROVIDER === "marzban") {
    if (!env.MARZBAN_API_URL || !env.MARZBAN_API_USERNAME || !env.MARZBAN_API_PASSWORD) {
      throw new Error(
        "VPN_PROVIDER=marzban requires MARZBAN_API_URL, MARZBAN_API_USERNAME, MARZBAN_API_PASSWORD",
      );
    }
    provider = new MarzbanVpnProvider({
      apiUrl: env.MARZBAN_API_URL,
      username: env.MARZBAN_API_USERNAME,
      password: env.MARZBAN_API_PASSWORD,
    });
  } else {
    provider = new MockVpnProvider();
  }
  return provider;
}

export type { VpnProvider, ProvisionInput, ProvisionResult } from "./vpn-provider.js";
