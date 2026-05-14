import { NextResponse } from "next/server";
import { mockSubscription } from "@/data/mock";

export async function GET() {
  return NextResponse.json(mockSubscription);
}
