import { NextResponse } from "next/server";
import { createRichMenuForTenant } from "@/lib/line/richMenu";

export async function POST(request: Request) {
  try {
    const { tenantId } = (await request.json()) as { tenantId?: string };
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }
    const richMenuId = await createRichMenuForTenant(tenantId);
    if (richMenuId) {
      return NextResponse.json({ success: true, richMenuId });
    }
    return NextResponse.json(
      { error: "Failed to create rich menu" },
      { status: 500 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

