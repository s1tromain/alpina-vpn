import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await context.params;
  return new NextResponse(null, { status: 204 });
}
