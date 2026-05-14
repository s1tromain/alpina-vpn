import { NextResponse } from "next/server";
import { mockPlans } from "@/data/mock";

export async function GET() {
  return NextResponse.json(mockPlans);
}
