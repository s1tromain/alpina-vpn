import { NextResponse } from "next/server";
import { mockAdminOrders } from "@/data/mock";
import type { OrderStatus } from "@/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { status: OrderStatus; note?: string };
  const order = mockAdminOrders.find((o) => o.id === id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({
    ...order,
    status: body.status,
    note: body.note,
    reviewedAt: new Date().toISOString(),
  });
}
