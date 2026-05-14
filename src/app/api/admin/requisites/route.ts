import { NextResponse } from "next/server";
import { mockRequisites } from "@/data/mock";
import type { PaymentRequisite } from "@/types";

export async function GET() {
  return NextResponse.json(mockRequisites);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<PaymentRequisite, "id">;
  return NextResponse.json(
    { id: `req_${Date.now()}`, ...body },
    { status: 201 },
  );
}
