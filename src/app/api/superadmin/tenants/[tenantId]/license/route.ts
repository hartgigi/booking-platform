import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { PACKAGE_ID_TO_PLAN, getPackageById } from "@/lib/packages";
import type { TenantPlan } from "@/types";

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

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  if (!(await verifySuperAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = params;
  let body: { packageId?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const pkg = getPackageById(body.packageId ?? "");
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }
  const plan = PACKAGE_ID_TO_PLAN[pkg.id] as TenantPlan;
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const data = tenantSnap.data();
  const currentExpiry = data?.licenseExpiry as { toDate?: () => Date } | null | undefined;
  let baseDate: Date;
  if (currentExpiry?.toDate) {
    const exp = currentExpiry.toDate();
    baseDate = exp.getTime() > Date.now() ? exp : new Date();
  } else {
    baseDate = new Date();
  }
  const newExpiry = addDays(baseDate, pkg.durationDays);
  await tenantRef.update({
    licenseExpiry: Timestamp.fromDate(newExpiry),
    plan,
    updatedAt: Timestamp.now(),
  });
  const paymentRef = tenantRef.collection("payments").doc();
  await paymentRef.set({
    amount: pkg.price,
    packageId: pkg.id,
    packageName: pkg.name,
    createdAt: Timestamp.now(),
    status: "manual",
    note: body.note ?? null,
  });
  const updated = await tenantRef.get();
  const updatedData = updated.data();
  const licenseExpiryTs = updatedData?.licenseExpiry as { toDate?: () => Date } | null;
  return NextResponse.json({
    id: tenantId,
    ...updatedData,
    licenseExpiry: licenseExpiryTs?.toDate
      ? licenseExpiryTs.toDate().toISOString()
      : null,
  });
}
