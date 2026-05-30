import type { ProvisionInput, ProvisionResult, VpnProvider } from "./vpn-provider.js";

/**
 * Marzban integration.
 *
 * Talks to a Marzban panel over its REST API:
 *   POST   /api/admin/token   (form-urlencoded login → bearer)
 *   POST   /api/user          (create user with proxies/inbounds/limits)
 *   GET    /api/user/{name}   (read; exposes `subscription_url`)
 *   PUT    /api/user/{name}   (update status: active / disabled)
 *   DELETE /api/user/{name}   (revoke)
 *
 * Reference: https://github.com/Gozargah/Marzban
 *
 * Provisioning is idempotent on the derived username: a 409 on create falls
 * back to a read + status/limit reconcile, so a retried approval (e.g. after
 * a transient DB rollback) doesn't mint a duplicate or error out.
 */
export interface MarzbanConfig {
  apiUrl: string;
  username: string;
  password: string;
  /** Origin for absolute subscription URLs; defaults to apiUrl origin. */
  subscriptionBaseUrl?: string;
  /** Proxy protocol → settings map, e.g. { vless: {} }. */
  proxies: Record<string, Record<string, unknown>>;
  /** Optional protocol → inbound tags map. Omit to use all inbounds. */
  inbounds?: Record<string, string[]>;
}

interface MarzbanUser {
  username: string;
  status: "active" | "disabled" | "limited" | "expired" | "on_hold";
  subscription_url?: string;
  expire?: number | null;
  data_limit?: number | null;
}

const REQUEST_TIMEOUT_MS = 10_000;

export class MarzbanVpnProvider implements VpnProvider {
  readonly name = "marzban" as const;

  /** Cached admin bearer token + its soft expiry (epoch ms). */
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly cfg: MarzbanConfig) {}

  // ── Public VpnProvider surface ──────────────────────────────────────────

  async provision(input: ProvisionInput): Promise<ProvisionResult> {
    const username = this.usernameFor(input);
    const expire = Math.floor(Date.now() / 1000) + input.durationDays * 86400;
    const dataLimit = input.trafficLimitBytes ?? 0; // 0 = unlimited in Marzban

    const body = {
      username,
      proxies: this.cfg.proxies,
      ...(this.cfg.inbounds ? { inbounds: this.cfg.inbounds } : {}),
      data_limit: Number(dataLimit),
      data_limit_reset_strategy: "no_reset",
      expire,
      status: "active",
    };

    let user: MarzbanUser;
    const created = await this.fetchMarzban<MarzbanUser | typeof CONFLICT>(
      "POST",
      "/api/user",
      body,
      { allowConflict: true },
    );
    if (created === CONFLICT) {
      // User already exists — read it and reconcile limits/expiry/status.
      user = await this.fetchMarzban<MarzbanUser>(
        "PUT",
        `/api/user/${encodeURIComponent(username)}`,
        { data_limit: Number(dataLimit), expire, status: "active" },
      );
    } else {
      user = created;
    }

    return {
      externalUserId: username,
      subscriptionUrl: this.absoluteSubscriptionUrl(user.subscription_url),
      expiresAt: new Date(expire * 1000),
    };
  }

  async suspend(externalUserId: string): Promise<void> {
    await this.setStatus(externalUserId, "disabled");
  }

  async resume(externalUserId: string): Promise<void> {
    await this.setStatus(externalUserId, "active");
  }

  async revoke(externalUserId: string): Promise<void> {
    await this.fetchMarzban<unknown>(
      "DELETE",
      `/api/user/${encodeURIComponent(externalUserId)}`,
      undefined,
      { allowMissing: true },
    );
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private async setStatus(username: string, status: "active" | "disabled") {
    await this.fetchMarzban<MarzbanUser>(
      "PUT",
      `/api/user/${encodeURIComponent(username)}`,
      { status },
    );
  }

  /** Stable, panel-safe username derived from our internal user id. */
  private usernameFor(input: ProvisionInput): string {
    // Marzban usernames allow [a-zA-Z0-9_-], 3–32 chars. The cuid `userId`
    // is alphanumeric; prefix keeps ours namespaced and human-recognisable.
    return `alpina_${input.userId}`.slice(0, 32);
  }

  private absoluteSubscriptionUrl(relativeOrAbsolute: string | undefined): string {
    if (!relativeOrAbsolute) {
      throw new Error("Marzban did not return a subscription_url");
    }
    if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
    const base = this.cfg.subscriptionBaseUrl ?? new URL(this.cfg.apiUrl).origin;
    return `${base.replace(/\/$/, "")}${relativeOrAbsolute}`;
  }

  private async getToken(force = false): Promise<string> {
    if (!force && this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }
    const form = new URLSearchParams({
      username: this.cfg.username,
      password: this.cfg.password,
      grant_type: "password",
    });
    const res = await this.rawFetch("/api/admin/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) {
      throw new Error(
        `Marzban auth failed (${res.status}): ${await safeText(res)}`,
      );
    }
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new Error("Marzban auth response missing access_token");
    }
    this.token = json.access_token;
    // Marzban tokens default to ~24h; refresh conservatively after 12h.
    this.tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
    return this.token;
  }

  /**
   * Authenticated JSON request with one automatic retry on 401 (token
   * refresh). `allowConflict` turns a 409 into the CONFLICT sentinel rather
   * than throwing; `allowMissing` swallows 404 (idempotent delete).
   */
  private async fetchMarzban<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { allowConflict?: boolean; allowMissing?: boolean; _retried?: boolean } = {},
  ): Promise<T> {
    const token = await this.getToken();
    const res = await this.rawFetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && !opts._retried) {
      // Token went stale early — force a refresh and retry once.
      await this.getToken(true);
      return this.fetchMarzban<T>(method, path, body, { ...opts, _retried: true });
    }
    if (res.status === 409 && opts.allowConflict) {
      return CONFLICT as unknown as T;
    }
    if (res.status === 404 && opts.allowMissing) {
      return undefined as unknown as T;
    }
    if (!res.ok) {
      throw new Error(
        `Marzban ${method} ${path} failed (${res.status}): ${await safeText(res)}`,
      );
    }
    if (res.status === 204) return undefined as unknown as T;
    return (await res.json()) as T;
  }

  private rawFetch(path: string, init: RequestInit): Promise<Response> {
    const url = `${this.cfg.apiUrl.replace(/\/$/, "")}${path}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    return fetch(url, { ...init, signal: ac.signal }).finally(() =>
      clearTimeout(timer),
    );
  }
}

/** Sentinel returned by fetchMarzban when a create hits an existing user. */
const CONFLICT = Symbol("marzban-conflict");

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "<no body>";
  }
}
