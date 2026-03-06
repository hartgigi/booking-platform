"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils/cn";
import type { TenantPlan } from "@/types";
import type { TenantWithStats } from "@/types/superAdmin";

const SUPER_ADMIN_TOKEN_KEY = "superAdminToken";

const PLAN_LABELS: Record<TenantPlan, string> = {
  trial: "Trial",
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

const PLAN_CLASS: Record<TenantPlan, string> = {
  trial: "bg-zinc-500/20 text-zinc-400",
  basic: "bg-blue-500/20 text-blue-400",
  pro: "bg-purple-500/20 text-purple-400",
  enterprise: "bg-amber-500/20 text-amber-400",
};

const BUSINESS_LABELS: Record<string, string> = {
  salon: "ซาลอน",
  spa: "สปา",
  clinic: "คลินิก",
  barbershop: "ร้านตัดผม",
  other: "อื่นๆ",
};

interface SystemStats {
  totalTenants: number;
  activeTenants: number;
  newThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  expiringIn7Days: number;
  monthlyNewTenants: { month: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export function SuperAdminDashboardClient() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [renewModal, setRenewModal] = useState<{ tenant: TenantWithStats } | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token) return;
    Promise.all([
      fetch("/api/superadmin/stats", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Stats failed")))),
      fetch("/api/superadmin/tenants", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Tenants failed")))),
    ])
      .then(([s, t]) => {
        setStats(s);
        setTenants(t);
      })
      .catch((err) => setError(err?.message ?? "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const now = useMemo(() => new Date(), []);
  const monthOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    for (let i = 1; i <= 12; i++) {
      const v = String(i).padStart(2, "0");
      out.push({
        value: v,
        label: new Date(2000, i - 1, 1).toLocaleDateString("th-TH", { month: "short" }),
      });
    }
    return out;
  }, []);
  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y, y - 1, y - 2].map((v) => ({ value: String(v), label: String(v) }));
  }, [now]);

  function getCreatedAt(t: TenantWithStats): Date | null {
    const ts = (t as { createdAt?: { toDate?: () => Date; _seconds?: number } }).createdAt;
    if (!ts) return null;
    if (typeof ts.toDate === "function") return ts.toDate();
    if (typeof (ts as { _seconds?: number })._seconds === "number")
      return new Date((ts as { _seconds: number })._seconds * 1000);
    return null;
  }

  const filteredTenants = useMemo(() => {
    let list = tenants;
    if (filterMonth && filterYear) {
      list = list.filter((t) => {
        const d = getCreatedAt(t);
        if (!d) return false;
        return d.getMonth() + 1 === Number(filterMonth) && d.getFullYear() === Number(filterYear);
      });
    }
    return list;
  }, [tenants, filterMonth, filterYear]);

  async function toggleActive(tenant: TenantWithStats) {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token) return;
    setActingId(tenant.id);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      if (!res.ok) throw new Error("ไม่สำเร็จ");
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenant.id ? { ...t, isActive: !t.isActive } : t
        )
      );
      if (stats)
        setStats((s) =>
          s
            ? {
                ...s,
                activeTenants: tenant.isActive
                  ? s.activeTenants - 1
                  : s.activeTenants + 1,
              }
            : null
        );
    } catch {
      setError("เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setActingId(null);
    }
  }

  async function renewLicense(tenantId: string, expiry: string, plan: TenantPlan) {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token) return;
    setActingId(tenantId);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          licenseExpiry: new Date(expiry).toISOString(),
          plan,
        }),
      });
      if (!res.ok) throw new Error("ไม่สำเร็จ");
      setRenewModal(null);
      const updated = await fetch("/api/superadmin/tenants", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).then((r) => r.json());
      setTenants(updated);
    } catch {
      setError("ต่ออายุไม่สำเร็จ");
    } finally {
      setActingId(null);
    }
  }

  function formatExpiry(t: TenantWithStats): string {
    const exp = (t as { licenseExpiry?: { toDate?: () => Date; _seconds?: number } | null })
      .licenseExpiry;
    if (!exp) return "-";
    if (typeof exp.toDate === "function") return exp.toDate().toLocaleDateString("th-TH");
    if (typeof (exp as { _seconds?: number })._seconds === "number")
      return new Date((exp as { _seconds: number })._seconds * 1000).toLocaleDateString("th-TH");
    return "-";
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-zinc-800" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-zinc-800" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-zinc-800" />
          <div className="h-64 rounded-xl bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 p-4">
          {error}
        </div>
      </div>
    );
  }

  const activeInactiveData =
    stats != null
      ? [
          { name: "Active", จำนวน: stats.activeTenants, fill: "rgb(34 197 94)" },
          {
            name: "Inactive",
            จำนวน: stats.totalTenants - stats.activeTenants,
            fill: "rgb(113 113 122)",
          },
        ]
      : [];

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">ร้านค้าทั้งหมด</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {stats?.totalTenants ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-semibold text-emerald-400 mt-1">
            {stats?.activeTenants ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">
            ใกล้หมดอายุ (7 วัน)
          </p>
          <p className="text-2xl font-semibold text-amber-400 mt-1">
            {stats?.expiringIn7Days ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">ใหม่เดือนนี้</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {stats?.newThisMonth ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">
            รายได้เดือนนี้
          </p>
          <p className="text-2xl font-semibold text-white mt-1">
            ฿{(stats?.revenueThisMonth ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">
            จำนวนร้านค้า Active/Inactive
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeInactiveData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis type="number" stroke="#71717a" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#71717a"
                  fontSize={12}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fafafa" }}
                />
                <Bar dataKey="จำนวน" radius={[0, 4, 4, 0]}>
                  {activeInactiveData.map((_, i) => (
                    <Cell key={i} fill={activeInactiveData[i].fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">
            รายได้ตามเดือน
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.monthlyRevenue ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [
                    `฿${Number(value).toLocaleString()}`,
                    "รายได้",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 mb-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">กรอง</h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">ทุกเดือน</option>
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">ทุกปี</option>
            {yearOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  ชื่อร้าน
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  ประเภท
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  แผน
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  วันหมดอายุ
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  สถานะ
                </th>
                <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-zinc-800/80 hover:bg-zinc-800/30"
                >
                  <td className="p-3 text-white font-medium">{t.name}</td>
                  <td className="p-3 text-zinc-400">
                    {BUSINESS_LABELS[t.businessType] ?? t.businessType}
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        PLAN_CLASS[t.plan ?? "trial"]
                      )}
                    >
                      {PLAN_LABELS[t.plan ?? "trial"]}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400">{formatExpiry(t)}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs",
                        t.isActive
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-zinc-500/20 text-zinc-400"
                      )}
                    >
                      {t.isActive ? "เปิดใช้" : "ระงับ"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setRenewModal({ tenant: t })}
                      disabled={actingId !== null}
                      className="rounded-lg border border-zinc-600 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 mr-2"
                    >
                      ต่ออายุ
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(t)}
                      disabled={actingId !== null}
                      className="rounded-lg border border-zinc-600 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {t.isActive ? "ระงับ" : "เปิดใช้"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTenants.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            ไม่มีร้านค้าที่ตรงกับตัวกรอง
          </div>
        )}
      </div>

      {renewModal && (
        <RenewModal
          tenant={renewModal.tenant}
          onClose={() => setRenewModal(null)}
          onConfirm={renewLicense}
          loading={actingId !== null}
        />
      )}
    </div>
  );
}

function RenewModal({
  tenant,
  onClose,
  onConfirm,
  loading,
}: {
  tenant: TenantWithStats;
  onClose: () => void;
  onConfirm: (tenantId: string, expiry: string, plan: TenantPlan) => Promise<void>;
  loading: boolean;
}) {
  const [expiry, setExpiry] = useState("");
  const [plan, setPlan] = useState<TenantPlan>(tenant.plan ?? "trial");
  useEffect(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    setExpiry(d.toISOString().slice(0, 10));
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 w-full max-w-md p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white mb-4">ต่ออายุ: {tenant.name}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">วันหมดอายุ</label>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">แผน</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as TenantPlan)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            >
              <option value="trial">Trial</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-600 py-2 text-zinc-300 hover:bg-zinc-800"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onConfirm(tenant.id, expiry, plan)}
            disabled={loading}
            className="flex-1 rounded-lg bg-amber-600 py-2 text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
