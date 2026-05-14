import { NextResponse } from "next/server";
import { mockAdminOrders } from "@/data/mock";

export async function GET() {
  return NextResponse.json(mockAdminOrders);
}
