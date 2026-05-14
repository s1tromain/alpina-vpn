import { NextResponse } from "next/server";
import { mockSubscription, mockUser } from "@/data/mock";

export async function GET() {
  return NextResponse.json({ ...mockUser, subscription: mockSubscription });
}
