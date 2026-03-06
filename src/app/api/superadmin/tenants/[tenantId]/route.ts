import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  getTenantStats,
  updateTenantLicense,
  deactivateTenant,
  activateTenant,
} from "@/lib/firebase/superAdmin";
import { Timestamp } from "firebase-admin/firestore";
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

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  if (!(await verifySuperAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = params;
  try {
    const [tenantDoc, stats] = await Promise.all([
      adminDb.collection("tenants").doc(tenantId).get(),
      getTenantStats(tenantId),
    ]);
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const data = tenantDoc.data();
    return NextResponse.json({
      id: tenantDoc.id,
      ...data,
      totalBookings: stats.totalBookings,
      totalRevenue: stats.totalRevenue,
      lastActivity: stats.lastActivity?.toMillis?.() ?? null,
    });
  } catch (err) {
    console.error("superadmin tenant get error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  if (!(await verifySuperAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tenantId } = params;
  try {
    const body = await request.json();
    if (typeof body.isActive === "boolean") {
      if (body.isActive) await activateTenant(tenantId);
      else await deactivateTenant(tenantId);
      return NextResponse.json({ ok: true });
    }
    if (body.licenseExpiry !== undefined || body.plan !== undefined) {
      const expiry = body.licenseExpiry != null ? Timestamp.fromMillis(new Date(body.licenseExpiry).getTime()) : null;
      const plan = (body.plan as TenantPlan) ?? "trial";
      await updateTenantLicense(tenantId, expiry, plan);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch (err) {
    console.error("superadmin tenant patch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
