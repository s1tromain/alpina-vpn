import { NextResponse } from "next/server";
import { mockOrders } from "@/data/mock";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const order = mockOrders.find((o) => o.id === id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ ...order, status: "pending" });
}
