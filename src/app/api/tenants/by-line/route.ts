import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineUserId = searchParams.get("lineUserId");

    if (!lineUserId) {
      return NextResponse.json(
        { error: "lineUserId is required" },
        { status: 400 }
      );
    }

    const snap = await adminDb
      .collection("tenants")
      .where("adminLineUserId", "==", lineUserId)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ exists: false });
    }

    const doc = snap.docs[0];
    const data = doc.data() || {};

    return NextResponse.json({
      exists: true,
      tenantId: doc.id,
      name: data.name ?? "",
      plan: data.plan ?? "trial",
    });
  } catch (err) {
    console.error("GET /api/tenants/by-line error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

