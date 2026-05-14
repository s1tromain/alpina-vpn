import { NextResponse } from "next/server";
import { mockAdminStats } from "@/data/mock";

export async function GET() {
  return NextResponse.json(mockAdminStats);
}
