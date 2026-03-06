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

  const { searchParams } = new URL(request.url);
  const monthStr = searchParams.get("month");
  const yearStr = searchParams.get("year");
  const tenantId = searchParams.get("tenantId");
  const mode = searchParams.get("mode");

  try {
    let queryRef: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      adminDb.collection("depositTransactions");

    if (tenantId) {
      queryRef = queryRef.where("tenantId", "==", tenantId);
    }
    if (mode === "auto" || mode === "manual") {
      queryRef = queryRef.where("mode", "==", mode);
    }

    if (monthStr && yearStr) {
      const month = Number(monthStr);
      const year = Number(yearStr);
      if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
        const start = new Date(year, month - 1, 1, 0, 0, 0);
        const end = new Date(year, month, 0, 23, 59, 59);
        queryRef = queryRef
          .where("createdAt", ">=", Timestamp.fromDate(start))
          .where("createdAt", "<=", Timestamp.fromDate(end));
      }
    }

    queryRef = queryRef.orderBy("createdAt", "desc");
    const snap = await queryRef.get();

    let totalDeposits = 0;
    let totalOmiseFee = 0;
    let totalSuperAdminProfit = 0;
    let totalShopReceive = 0;

    const transactions = snap.docs.map((d) => {
      const data = d.data();
      const amount = Number(data.amount) || 0;
      const omiseFee = Number(data.omiseFee) || 0;
      const superAdminReceiveAmount =
        Number(data.superAdminReceiveAmount) || 0;
      const shopReceiveAmount = Number(data.shopReceiveAmount) || 0;
      totalDeposits += amount;
      totalOmiseFee += omiseFee;
      totalSuperAdminProfit += superAdminReceiveAmount;
      totalShopReceive += shopReceiveAmount;
      return {
        id: d.id,
        ...data,
      };
    });

    return NextResponse.json({
      transactions,
      summary: {
        totalDeposits,
        totalOmiseFee,
        totalSuperAdminProfit,
        totalShopReceive,
        count: transactions.length,
      },
    });
  } catch (err) {
    console.error("superadmin deposits error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

