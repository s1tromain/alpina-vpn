import { NextResponse } from "next/server";
import { mockOrders, mockPlans, mockCountries } from "@/data/mock";
import type { Order } from "@/types";

export async function GET() {
  return NextResponse.json(mockOrders);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    planId: string;
    countryCode: string;
    requisiteId: string;
  };

  const plan = mockPlans.find((p) => p.id === body.planId);
  const country = mockCountries.find((c) => c.code === body.countryCode);

  if (!plan || !country) {
    return NextResponse.json({ error: "Invalid plan or country" }, { status: 400 });
  }

  const order: Order = {
    id: `ord_${Date.now()}`,
    userId: "u_01",
    username: "ghost_client",
    planId: plan.id,
    planLabel: plan.label,
    countryCode: country.code,
    countryName: country.name,
    amount: plan.priceUsd,
    currency: "USD",
    status: "pending",
    createdAt: new Date().toISOString(),
    paymentRequisiteId: body.requisiteId,
  };

  return NextResponse.json(order, { status: 201 });
}
