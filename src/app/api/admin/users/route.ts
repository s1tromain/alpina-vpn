import { NextResponse } from "next/server";
import { mockAdminUsers } from "@/data/mock";

export async function GET() {
  return NextResponse.json(mockAdminUsers);
}
