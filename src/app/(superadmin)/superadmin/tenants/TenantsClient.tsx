"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import { PACKAGES } from "@/lib/packages";
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

export function TenantsClient() {
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [renewModal, setRenewModal] = useState<TenantWithStats | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token) return;
    fetch("/api/superadmin/tenants", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("โหลดไม่สำเร็จ"))))
      .then(setTenants)
      .catch((err) => setError(err?.message ?? "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const filteredTenants = useMemo(() => {
    let list = tenants;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.adminEmail ?? "").toLowerCase().includes(q)
      );
    }
    if (filterPlan) list = list.filter((t) => (t.plan ?? "trial") === filterPlan);
    if (filterStatus === "active") list = list.filter((t) => t.isActive);
    if (filterStatus === "inactive") list = list.filter((t) => !t.isActive);
    return list;
  }, [tenants, search, filterPlan, filterStatus]);

  function formatExpiry(t: TenantWithStats): string {
    const exp = (t as { licenseExpiry?: { toDate?: () => Date; _seconds?: number } | null })
      .licenseExpiry;
    if (!exp) return "-";
    if (typeof exp.toDate === "function") return exp.toDate().toLocaleDateString("th-TH");
    if (typeof (exp as { _seconds?: number })._seconds === "number")
      return new Date((exp as { _seconds: number })._seconds * 1000).toLocaleDateString("th-TH");
    return "-";
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredTenants.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTenants.map((t) => t.id)));
  }

  async function bulkSetActive(isActive: boolean) {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token || selectedIds.size === 0) return;
    setActingId("bulk");
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/superadmin/tenants/${id}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isActive }),
          })
        )
      );
      const updated = await fetch("/api/superadmin/tenants", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).then((r) => r.json());
      setTenants(updated);
      setSelectedIds(new Set());
    } catch {
      setError("ดำเนินการไม่สำเร็จ");
    } finally {
      setActingId(null);
    }
  }

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
    } catch {
      setError("เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-zinc-800" />
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

  const detailTenant = detailId ? tenants.find((t) => t.id === detailId) : null;

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-white mb-6">ร้านค้าทั้งหมด</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          placeholder="ค้นหาชื่อร้าน หรืออีเมล..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 w-64 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
        />
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">ทุกแผน</option>
          <option value="trial">Trial</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">ทุกสถานะ</option>
          <option value="active">เปิดใช้</option>
          <option value="inactive">ระงับ</option>
        </select>
        {selectedIds.size > 0 && (
          <>
            <button
              type="button"
              onClick={() => bulkSetActive(true)}
              disabled={actingId !== null}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              เปิดใช้ ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() => bulkSetActive(false)}
              disabled={actingId !== null}
              className="rounded-lg bg-zinc-600 px-3 py-2 text-sm text-white hover:bg-zinc-500 disabled:opacity-50"
            >
              ระงับ ({selectedIds.size})
            </button>
          </>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="text-left p-3 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredTenants.length > 0 &&
                      selectedIds.size === filteredTenants.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
                  />
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  ชื่อร้าน
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  อีเมล
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  ประเภทธุรกิจ
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  แผน
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  วันหมดอายุ
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  การจอง
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  รายได้
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setDetailId(detailId === t.id ? null : t.id)}
                  className={cn(
                    "border-b border-zinc-800/80 cursor-pointer hover:bg-zinc-800/30",
                    detailId === t.id && "bg-zinc-800/50"
                  )}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
                    />
                  </td>
                  <td className="p-3 text-white font-medium">{t.name}</td>
                  <td className="p-3 text-zinc-400 text-sm">{t.adminEmail ?? "-"}</td>
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
                  <td className="p-3 text-zinc-400">{t.totalBookings ?? 0}</td>
                  <td className="p-3 text-zinc-400">
                    ฿{(t.totalRevenue ?? 0).toLocaleString()}
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTenants.length === 0 && (
          <div className="p-8 text-center text-zinc-500">ไม่พบร้านค้า</div>
        )}
      </div>

      {detailTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="rounded-2xl border border-zinc-800 bg-zinc-900 w-full max-w-lg p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white mb-4">
              {detailTenant.name}
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">อีเมล</dt>
                <dd className="text-white">{detailTenant.adminEmail ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">ประเภทธุรกิจ</dt>
                <dd className="text-white">
                  {BUSINESS_LABELS[detailTenant.businessType] ?? detailTenant.businessType}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">แผน</dt>
                <dd>
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                      PLAN_CLASS[detailTenant.plan ?? "trial"]
                    )}
                  >
                    {PLAN_LABELS[detailTenant.plan ?? "trial"]}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">วันหมดอายุ</dt>
                <dd className="text-white">{formatExpiry(detailTenant)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">การจอง / รายได้</dt>
                <dd className="text-white">
                  {detailTenant.totalBookings ?? 0} / ฿
                  {(detailTenant.totalRevenue ?? 0).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">สถานะ</dt>
                <dd className="text-white">
                  {detailTenant.isActive ? "เปิดใช้" : "ระงับ"}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                onClick={() => setRenewModal(detailTenant)}
                disabled={actingId !== null}
                className="rounded-lg border border-amber-500/50 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
              >
                ต่ออายุ
              </button>
              <button
                type="button"
                onClick={() => toggleActive(detailTenant)}
                disabled={actingId !== null}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                {detailTenant.isActive ? "ระงับ" : "เปิดใช้"}
              </button>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {renewModal && (
        <RenewLicenseModal
          tenant={renewModal}
          formatExpiry={formatExpiry}
          onClose={() => setRenewModal(null)}
          onSuccess={async () => {
            setRenewModal(null);
            setDetailId(null);
            const token =
              typeof window !== "undefined"
                ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
                : null;
            if (token) {
              const r = await fetch("/api/superadmin/tenants", {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
              });
              if (r.ok) setTenants(await r.json());
            }
          }}
          actingId={actingId}
          setActingId={setActingId}
          setError={setError}
        />
      )}
    </div>
  );
}

function RenewLicenseModal({
  tenant,
  formatExpiry,
  onClose,
  onSuccess,
  actingId,
  setActingId,
  setError,
}: {
  tenant: TenantWithStats;
  formatExpiry: (t: TenantWithStats) => string;
  onClose: () => void;
  onSuccess: () => void;
  actingId: string | null;
  setActingId: (v: string | null) => void;
  setError: (v: string | null) => void;
}) {
  const [packageId, setPackageId] = useState<string>("together");
  const [note, setNote] = useState("");
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
      : null;

  async function handleSubmit() {
    if (!token) return;
    setActingId(tenant.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/superadmin/tenants/${tenant.id}/license`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ packageId, note: note.trim() || undefined }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      onSuccess();
    } catch {
      setError("บันทึกไม่สำเร็จ");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="rounded-2xl border border-zinc-800 bg-zinc-900 w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-2">ต่ออายุ: {tenant.name}</h2>
        <p className="text-sm text-zinc-400 mb-4">
          วันหมดอายุปัจจุบัน: {formatExpiry(tenant)}
        </p>
        <div className="space-y-3 mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">แพ็คเกจ</p>
          {PACKAGES.map((p) => (
            <label
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                packageId === p.id
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-zinc-700 hover:bg-zinc-800/50"
              )}
            >
              <input
                type="radio"
                name="package"
                value={p.id}
                checked={packageId === p.id}
                onChange={() => setPackageId(p.id)}
                className="text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-white font-medium">{p.name}</span>
              <span className="text-zinc-500 text-xs">{p.duration}</span>
              <span className="text-zinc-400 text-sm ml-auto">฿{p.price.toLocaleString()}</span>
            </label>
          ))}
        </div>
        <div className="mb-6">
          <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
            หมายเหตุ
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="หมายเหตุ (ถ้ามี)"
            rows={2}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-600 py-2 text-zinc-300 hover:bg-zinc-800"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={actingId !== null}
            className="flex-1 rounded-lg bg-amber-600 py-2 text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {actingId === tenant.id ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
