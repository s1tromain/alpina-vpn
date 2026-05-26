/**
 * Callback-data codec for inline keyboard buttons.
 *
 * Telegram caps `callback_data` at 64 bytes — keep the prefix short. We use
 * a colon-delimited tagged scheme so the dispatcher can quickly route to the
 * right handler without parsing the order id (a cuid, ~25 chars).
 *
 *   o:a:<orderId>          → approve an order
 *   o:r:<orderId>          → open the reject reason picker
 *   o:r:<orderId>:<reason> → final reject with reason
 *   noop                   → button that does nothing (status echo / disabled state)
 *
 * Reason codes are 3-letter to keep us well under the 64-byte limit; the
 * mapping back to the `noteKey` enum value lives in `REJECT_REASONS` below.
 */

export const REJECT_REASONS = {
  pnr: { noteKey: "paymentNotReceived" as const, label: "💸 Платёж не получен" },
  oth: { noteKey: undefined, label: "❓ Другая причина" },
} as const;

export type RejectReasonCode = keyof typeof REJECT_REASONS;

export type ParsedCallback =
  | { kind: "approve"; orderId: string }
  | { kind: "reject-prompt"; orderId: string }
  | { kind: "reject-confirm"; orderId: string; reason: RejectReasonCode }
  | { kind: "noop" }
  | { kind: "unknown"; raw: string };

export function encodeApprove(orderId: string): string {
  return `o:a:${orderId}`;
}

export function encodeRejectPrompt(orderId: string): string {
  return `o:r:${orderId}`;
}

export function encodeRejectConfirm(orderId: string, reason: RejectReasonCode): string {
  return `o:r:${orderId}:${reason}`;
}

export function encodeNoop(): string {
  return "noop";
}

export function parseCallback(data: string | undefined): ParsedCallback {
  if (!data) return { kind: "unknown", raw: "" };
  if (data === "noop") return { kind: "noop" };

  const parts = data.split(":");
  if (parts[0] !== "o") return { kind: "unknown", raw: data };

  const op = parts[1];
  const orderId = parts[2];
  if (!orderId) return { kind: "unknown", raw: data };

  if (op === "a") return { kind: "approve", orderId };

  if (op === "r") {
    const reason = parts[3];
    if (!reason) return { kind: "reject-prompt", orderId };
    if (reason in REJECT_REASONS) {
      return { kind: "reject-confirm", orderId, reason: reason as RejectReasonCode };
    }
  }

  return { kind: "unknown", raw: data };
}
