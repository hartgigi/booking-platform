import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getSystemStats } from "@/lib/firebase/superAdmin";

async function verifySuperAdmin(request: NextRequest): Promise<{ uid: string } | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || !(userDoc.data()?.isSuperAdmin === true)) return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const stats = await getSystemStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("superadmin stats error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
