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

export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snap = await adminDb
    .collection("systemSettings")
    .doc("chargeConfig")
    .get();
  const data = snap.exists ? snap.data() || {} : {};
  const omiseFeePercent = (data.omiseFeePercent as number) ?? 3.65;
  const additionalFeePercent = (data.additionalFeePercent as number) ?? 1.0;
  const chargePercent =
    (data.chargePercent as number) ?? omiseFeePercent + additionalFeePercent;
  return NextResponse.json({
    omiseFeePercent,
    additionalFeePercent,
    chargePercent,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifySuperAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const additionalFeePercentRaw = Number(body.additionalFeePercent);
    const additionalFeePercent =
      Number.isFinite(additionalFeePercentRaw) && additionalFeePercentRaw >= 0
        ? additionalFeePercentRaw
        : 0;
    const omiseFeePercent = 3.65;
    const chargePercent = omiseFeePercent + additionalFeePercent;
    await adminDb
      .collection("systemSettings")
      .doc("chargeConfig")
      .set(
        {
          omiseFeePercent,
          additionalFeePercent,
          chargePercent,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    return NextResponse.json({
      omiseFeePercent,
      additionalFeePercent,
      chargePercent,
    });
  } catch (err) {
    console.error("charge-config error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

