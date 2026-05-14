import { NextResponse } from "next/server";
import { mockRequisites } from "@/data/mock";

export async function GET() {
  return NextResponse.json(mockRequisites.filter((r) => r.active));
}
