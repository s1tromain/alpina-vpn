import { NextResponse } from "next/server";
import { mockSubscription, mockUser } from "@/data/mock";

/**
 * POST /api/auth/me
 * Validates Telegram initData (X-Telegram-Init-Data header) and returns the user.
 * In production: verify HMAC signature against bot token before trusting payload.
 */
export async function POST() {
  return NextResponse.json({ ...mockUser, subscription: mockSubscription });
}
