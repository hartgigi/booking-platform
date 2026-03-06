import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getAllTenants } from "@/lib/firebase/superAdmin";

async function verifySuperAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return false;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    return userDoc.exists === true && userDoc.data()?.isSuperAdmin === true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifySuperAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const tenants = await getAllTenants();
    return NextResponse.json(tenants);
  } catch (err) {
    console.error("superadmin tenants error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
