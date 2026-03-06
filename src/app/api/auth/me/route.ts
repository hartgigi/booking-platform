import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email ?? "";
    if (!email) {
      return NextResponse.json({ error: "No email in token" }, { status: 401 });
    }
    const snapshot = await adminDb
      .collection("tenants")
      .where("adminEmail", "==", email)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return NextResponse.json(
        { error: "No tenant for this admin", tenantId: null, email },
        { status: 200 }
      );
    }
    const doc = snapshot.docs[0];
    const tenantId = doc.id;
    const data = doc.data();
    const licenseExpiry = data?.licenseExpiry as { toDate?: () => Date } | null | undefined;
    return NextResponse.json({
      tenantId,
      email,
      tenantName: (data?.name as string) ?? "",
      businessType: (data?.businessType as string) ?? "",
      plan: (data?.plan as string) ?? "trial",
      licenseExpiry: licenseExpiry?.toDate ? licenseExpiry.toDate().toISOString() : null,
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
