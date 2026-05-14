import { NextResponse } from "next/server";
import { mockCountries } from "@/data/mock";

export async function GET() {
  return NextResponse.json(mockCountries);
}
