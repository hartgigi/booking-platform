import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "Not super admin" }, { status: 403 });
    }
    const data = userDoc.data();
    if (!(data?.isSuperAdmin === true)) {
      return NextResponse.json({ error: "Not super admin" }, { status: 403 });
    }
    return NextResponse.json({ uid, email: decoded.email ?? "" });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
