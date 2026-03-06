import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

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
  const { searchParams } = request.nextUrl;
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const tenantsSnap = await adminDb.collection("tenants").get();
  const payments: {
    id: string;
    tenantId: string;
    tenantName: string;
    packageName: string;
    amount: number;
    method: "Stripe" | "Manual";
    createdAt: string;
    status: string;
  }[] = [];
  let totalRevenue = 0;
  const filterYear = year ? parseInt(year, 10) : null;
  const filterMonth = month ? parseInt(month, 10) : null;
  for (const tenantDoc of tenantsSnap.docs) {
    const tenantData = tenantDoc.data();
    const tenantName = (tenantData.name as string) ?? "";
    const paySnap = await tenantDoc.ref.collection("payments").get();
    for (const payDoc of paySnap.docs) {
      const data = payDoc.data();
      const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
      if (!createdAt?.toDate) continue;
      const d = createdAt.toDate();
      if (filterYear != null && d.getFullYear() !== filterYear) continue;
      if (filterMonth != null && d.getMonth() + 1 !== filterMonth) continue;
      const amount = Number(data.amount) ?? 0;
      totalRevenue += amount;
      payments.push({
        id: payDoc.id,
        tenantId: tenantDoc.id,
        tenantName,
        packageName: (data.packageName as string) ?? "",
        amount,
        method: data.stripeSessionId ? "Stripe" : "Manual",
        createdAt: d.toISOString(),
        status: (data.status as string) ?? "",
      });
    }
  }
  payments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return NextResponse.json({ payments, totalRevenue });
}
