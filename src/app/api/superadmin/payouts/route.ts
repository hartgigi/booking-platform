import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

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

  try {
    const depositsSnap = await adminDb
      .collection("depositTransactions")
      .where("mode", "==", "auto")
      .where("status", "==", "completed")
      .get();

    const byTenant: Record<
      string,
      {
        tenantId: string;
        tenantName: string;
        totalEarned: number;
      }
    > = {};

    for (const doc of depositsSnap.docs) {
      const d = doc.data();
      const tenantId = (d.tenantId as string) ?? "";
      if (!tenantId) continue;
      if (!byTenant[tenantId]) {
        byTenant[tenantId] = {
          tenantId,
          tenantName: (d.tenantName as string) ?? "",
          totalEarned: 0,
        };
      }
      byTenant[tenantId].totalEarned += Number(d.shopReceiveAmount) || 0;
    }

    const payoutsSnap = await adminDb.collection("shopPayouts").get();
    const paidByTenant: Record<string, number> = {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let totalPaidThisMonth = 0;
    for (const doc of payoutsSnap.docs) {
      const d = doc.data();
      const tenantId = (d.tenantId as string) ?? "";
      const amount = Number(d.totalAmount ?? d.amount) || 0;
      if (!paidByTenant[tenantId]) paidByTenant[tenantId] = 0;
      paidByTenant[tenantId] += amount;
      const paidAt = d.paidAt as Timestamp | undefined;
      if (paidAt && paidAt.toDate() >= monthStart) {
        totalPaidThisMonth += amount;
      }
    }

    const payouts = await Promise.all(
      Object.values(byTenant).map(async (entry) => {
        const tenantDoc = await adminDb
          .collection("tenants")
          .doc(entry.tenantId)
          .get();
        const tData = tenantDoc.exists ? tenantDoc.data() || {} : {};
        const totalEarned = entry.totalEarned;
        const totalPaid = paidByTenant[entry.tenantId] || 0;
        const pendingAmount = Math.max(totalEarned - totalPaid, 0);
        return {
          tenantId: entry.tenantId,
          tenantName: (tData.name as string) ?? entry.tenantName ?? "",
          bankName: (tData.bankName as string) ?? "",
          bankAccountNumber: (tData.bankAccountNumber as string) ?? "",
          bankAccountName: (tData.bankAccountName as string) ?? "",
          promptPayNumber: (tData.promptPayNumber as string) ?? "",
          totalEarned,
          totalPaid,
          pendingAmount,
        };
      })
    );

    const totalPending = payouts.reduce(
      (sum, p) => sum + (p.pendingAmount || 0),
      0
    );

    return NextResponse.json({
      payouts,
      totalPending,
      totalPaidThisMonth,
    });
  } catch (err) {
    console.error("superadmin payouts error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

