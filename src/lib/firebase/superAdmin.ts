import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import type { TenantWithStats } from "@/types/superAdmin";
import type { TenantPlan } from "@/types";

export interface TenantStats {
  totalBookings: number;
  totalRevenue: number;
  lastActivity: Timestamp | null;
}

export interface SystemStats {
  totalTenants: number;
  activeTenants: number;
  newThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  expiringIn7Days: number;
  monthlyNewTenants: { month: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

async function getBookingsSnapshot(tenantId: string) {
  const topLevel = await adminDb
    .collection("bookings")
    .where("tenantId", "==", tenantId)
    .get();
  if (!topLevel.empty) return topLevel;
  const sub = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("bookings")
    .get();
  return sub;
}

export async function getAllTenants(): Promise<TenantWithStats[]> {
  const tenantsSnap = await adminDb.collection("tenants").get();
  const out: TenantWithStats[] = [];
  for (const doc of tenantsSnap.docs) {
    const data = doc.data();
    const stats = await getTenantStats(doc.id);
    out.push({
      id: doc.id,
      ...data,
      plan: (data.plan as TenantPlan) ?? "trial",
      licenseExpiry: (data.licenseExpiry as Timestamp) ?? null,
      isActive: (data.isActive as boolean) ?? true,
      totalBookings: stats.totalBookings,
      totalRevenue: stats.totalRevenue,
    } as TenantWithStats);
  }
  return out;
}

export async function getTenantStats(tenantId: string): Promise<TenantStats> {
  const snap = await getBookingsSnapshot(tenantId);
  let totalRevenue = 0;
  let lastActivity: Timestamp | null = null;
  for (const d of snap.docs) {
    const b = d.data();
    if (b.status === "confirmed" || b.status === "completed") {
      totalRevenue += Number(b.price) ?? 0;
    }
    const updated = (b.updatedAt ?? b.createdAt) as Timestamp | undefined;
    if (updated && (!lastActivity || updated.toMillis() > lastActivity.toMillis())) {
      lastActivity = updated;
    }
  }
  return {
    totalBookings: snap.size,
    totalRevenue,
    lastActivity,
  };
}

export async function updateTenantLicense(
  tenantId: string,
  expiry: Timestamp | null,
  plan: TenantPlan
): Promise<void> {
  await adminDb.collection("tenants").doc(tenantId).update({
    licenseExpiry: expiry,
    plan,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deactivateTenant(tenantId: string): Promise<void> {
  await adminDb.collection("tenants").doc(tenantId).update({
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function activateTenant(tenantId: string): Promise<void> {
  await adminDb.collection("tenants").doc(tenantId).update({
    isActive: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getSystemStats(): Promise<SystemStats> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const tenantsSnap = await adminDb.collection("tenants").get();
  let activeTenants = 0;
  let newThisMonth = 0;
  let totalRevenue = 0;
  let expiringIn7Days = 0;
  const monthCounts: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthCounts[key] = 0;
  }

  for (const doc of tenantsSnap.docs) {
    const data = doc.data();
    const isActive = (data.isActive as boolean) ?? true;
    if (isActive) activeTenants += 1;
    const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
    if (createdAt?.toDate) {
      const d = createdAt.toDate();
      const key = d.toISOString().slice(0, 7);
      if (key === now.toISOString().slice(0, 7)) newThisMonth += 1;
      if (monthCounts[key] !== undefined) monthCounts[key] += 1;
    }
    const licenseExpiry = data.licenseExpiry as { toDate?: () => Date } | null | undefined;
    if (licenseExpiry?.toDate) {
      const exp = licenseExpiry.toDate();
      const diff = (exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      if (diff >= 0 && diff <= 7) expiringIn7Days += 1;
    }
    const stats = await getTenantStats(doc.id);
    totalRevenue += stats.totalRevenue;
  }

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
  const bookingsSnap = await adminDb
    .collection("bookings")
    .where("date", ">=", monthStart)
    .where("date", "<=", monthEnd)
    .get();
  let revenueThisMonth = 0;
  for (const d of bookingsSnap.docs) {
    const b = d.data();
    if (b.status === "confirmed" || b.status === "completed") {
      revenueThisMonth += Number(b.price) ?? 0;
    }
  }

  const monthlyNewTenants = Object.entries(monthCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const mEndStr = `${mEnd.getFullYear()}-${String(mEnd.getMonth() + 1).padStart(2, "0")}-${String(mEnd.getDate()).padStart(2, "0")}`;
    const snap = await adminDb
      .collection("bookings")
      .where("date", ">=", mStart)
      .where("date", "<=", mEndStr)
      .get();
    let rev = 0;
    for (const doc of snap.docs) {
      const b = doc.data();
      if (b.status === "confirmed" || b.status === "completed") rev += Number(b.price) ?? 0;
    }
    monthlyRevenue.push({
      month: d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
      revenue: rev,
    });
  }

  return {
    totalTenants: tenantsSnap.size,
    activeTenants,
    newThisMonth,
    totalRevenue,
    revenueThisMonth,
    expiringIn7Days,
    monthlyNewTenants,
    monthlyRevenue,
  };
}
