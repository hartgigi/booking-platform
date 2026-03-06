import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

async function verifySuperAdmin(
  request: NextRequest
): Promise<{ uid: string } | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.isSuperAdmin !== true) return null;
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const auth = await verifySuperAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = params;
  try {
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    const note = (body.note as string) ?? "";
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }
    const tenantSnap = await adminDb.collection("tenants").doc(tenantId).get();
    if (!tenantSnap.exists) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }
    const tData = tenantSnap.data() || {};
    const payoutRef = await adminDb.collection("shopPayouts").add({
      tenantId,
      tenantName: (tData.name as string) ?? "",
      totalAmount: amount,
      bankName: (tData.bankName as string) ?? "",
      bankAccountNumber: (tData.bankAccountNumber as string) ?? "",
      bankAccountName: (tData.bankAccountName as string) ?? "",
      note,
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: payoutRef.id });
  } catch (err) {
    console.error("payouts patch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

