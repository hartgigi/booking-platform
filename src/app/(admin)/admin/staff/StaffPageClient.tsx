"use client";

import { useState, useMemo, useEffect } from "react";

const FIREBASE_TOKEN_KEY = "firebaseToken";
import { useStaff } from "@/hooks/useStaff";
import { useServices } from "@/hooks/useServices";
import { useBookings } from "@/hooks/useBookings";
import {
  deleteStaff,
  toggleStaffStatus,
} from "@/lib/firebase/staff";
import StaffModal from "@/components/admin/StaffModal";
import { cn } from "@/lib/utils/cn";
import type { Staff } from "@/types";
import { Plus, User, Pencil, Trash2 } from "lucide-react";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const DAY_LABELS: Record<number, string> = {
  0: "อา",
  1: "จ",
  2: "อ",
  3: "พ",
  4: "พฤ",
  5: "ศ",
  6: "ส",
  7: "อา",
};

const DAY_PILL_CLASS: Record<number, string> = {
  0: "bg-rose-100 text-rose-700",
  1: "bg-sky-100 text-sky-700",
  2: "bg-violet-100 text-violet-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-emerald-100 text-emerald-700",
  5: "bg-teal-100 text-teal-700",
  6: "bg-indigo-100 text-indigo-700",
  7: "bg-rose-100 text-rose-700",
};

interface StaffPageClientProps {
  tenantId: string;
}

export function StaffPageClient({ tenantId }: StaffPageClientProps) {
  const { staffList, loading, error } = useStaff(tenantId);
  const { services } = useServices(tenantId);
  const { bookings } = useBookings(tenantId, {});
  const [search, setSearch] = useState("");
  const [filterServiceId, setFilterServiceId] = useState("");
  const [filterWorkDay, setFilterWorkDay] = useState<number | null>(null);
   const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [tenantDefaults, setTenantDefaults] = useState<{
    openTime: string;
    closeTime: string;
    openDays: number[];
  } | null>(null);

  useEffect(() => {
    if (!modalOpen || editingStaff != null) {
      setTenantDefaults(null);
      return;
    }
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem(FIREBASE_TOKEN_KEY) : null;
    if (!token) return;
    fetch("/api/admin/tenant", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data)
          setTenantDefaults({
            openTime: data.openTime ?? "09:00",
            closeTime: data.closeTime ?? "18:00",
            openDays: Array.isArray(data.openDays) ? data.openDays : [1, 2, 3, 4, 5, 6],
          });
        else setTenantDefaults(null);
      })
      .catch(() => setTenantDefaults(null));
  }, [modalOpen, editingStaff]);

  const serviceMap = useMemo(() => {
    const m: Record<string, string> = {};
    services.forEach((s) => (m[s.id] = s.name));
    return m;
  }, [services]);

  const bookingCountByStaff = useMemo(() => {
    const count: Record<string, number> = {};
    staffList.forEach((s) => (count[s.id] = 0));
    bookings.forEach((b) => {
      if (count[b.staffId] !== undefined) count[b.staffId]++;
    });
    return count;
  }, [bookings, staffList]);

  const filtered = useMemo(() => {
    const workDayValue =
      filterWorkDay == null ? null : filterWorkDay === 0 ? 7 : filterWorkDay;
    return staffList.filter((s) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!s.name.toLowerCase().includes(q)) return false;
      }
      if (filterServiceId && !s.serviceIds.includes(filterServiceId)) return false;
      if (workDayValue != null && !s.workDays.includes(workDayValue)) return false;
      if (filterStatus === "active" && !s.isActive) return false;
      if (filterStatus === "inactive" && s.isActive) return false;
      return true;
    });
  }, [staffList, search, filterServiceId, filterWorkDay, filterStatus]);

  function handleEdit(s: Staff) {
    setEditingStaff(s);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingStaff(null);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingStaff(null);
  }

  async function handleToggle(s: Staff) {
    setTogglingId(s.id);
    try {
      await toggleStaffStatus(tenantId, s.id);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(s: Staff) {
    if (!confirm(`ต้องการลบพนักงาน "${s.name}" ใช่หรือไม่?`)) return;
    setDeletingId(s.id);
    try {
      await deleteStaff(tenantId, s.id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-slate-500">ไม่พบ tenant</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            พนักงาน
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            จัดการพนักงานและวันทำงาน
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#0D9488] to-[#0891B2] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-teal-900/25 hover:shadow-xl transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          เพิ่มพนักงาน
        </button>
      </div>

      <div className="mb-4 space-y-3">
        <div>
          <label htmlFor="staff-search" className="block text-sm font-medium text-slate-700 mb-1.5">
            ค้นหา
          </label>
          <input
            id="staff-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อพนักงาน..."
            className="w-full max-w-xs px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="staff-filter-service" className="block text-sm font-medium text-slate-700 mb-1">
              บริการ
            </label>
            <select
              id="staff-filter-service"
              value={filterServiceId}
              onChange={(e) => setFilterServiceId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">ทุกบริการ</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">วันทำงาน</label>
            <div className="flex gap-1">
              {([0, 1, 2, 3, 4, 5, 6] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilterWorkDay((prev) => (prev === d ? null : d))}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    filterWorkDay === d
                      ? DAY_PILL_CLASS[d]
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              สถานะ
            </label>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 overflow-hidden">
              {[
                { key: "all", label: "ทั้งหมด" },
                { key: "active", label: "เปิด" },
                { key: "inactive", label: "ปิด" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    filterStatus === opt.key
                      ? "bg-teal-600 text-white"
                      : "bg-transparent text-slate-600 hover:bg-slate-200"
                  )}
                  onClick={() =>
                    setFilterStatus(opt.key as "all" | "active" | "inactive")
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-4 mb-6">
          {error.message}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white card-shadow h-64 animate-shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center card-shadow">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-100 mb-6">
            <User className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {search.trim() || filterServiceId || filterWorkDay != null
              ? "ไม่พบพนักงานที่ตรงกับตัวกรอง"
              : "ยังไม่มีพนักงาน"}
          </h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
            {search.trim() || filterServiceId || filterWorkDay != null
              ? "ลองเปลี่ยนคำค้นหรือตัวกรอง"
              : "เพิ่มพนักงานคนแรกเพื่อกำหนดบริการและวันทำงาน"}
          </p>
          {!search.trim() && !filterServiceId && filterWorkDay == null && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#0D9488] to-[#0891B2] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-teal-900/25 hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              เพิ่มพนักงานคนแรก
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl bg-white border border-slate-200 card-shadow overflow-hidden hover:scale-[1.01] transition-transform duration-200 flex flex-col"
            >
              <div className="bg-linear-to-r from-[#0D9488] to-[#0891B2] h-20 flex items-center justify-center shrink-0">
                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center overflow-hidden shadow-lg">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-semibold text-xl">
                      {getInitials(s.name)}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 flex-1">
                <h3 className="font-semibold text-slate-900 truncate">{s.name}</h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.serviceIds.slice(0, 3).map((id) => (
                    <span
                      key={id}
                      className="rounded-lg bg-teal-50 border border-teal-100 px-2 py-0.5 text-xs text-teal-700 font-medium"
                    >
                      {serviceMap[id] ?? id}
                    </span>
                  ))}
                  {s.serviceIds.length > 3 && (
                    <span className="text-xs text-slate-400">+{s.serviceIds.length - 3}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.workDays.length > 0 ? (
                    s.workDays
                      .sort((a, b) => a - b)
                      .map((d) => (
                        <span
                          key={d}
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-xs font-medium",
                            DAY_PILL_CLASS[d] ?? "bg-slate-100 text-slate-600"
                          )}
                        >
                          {DAY_LABELS[d]}
                        </span>
                      ))
                  ) : (
                    <span className="text-xs text-slate-400">ยังไม่ได้ตั้งวันทำงาน</span>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggle(s)}
                  disabled={togglingId === s.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border cursor-pointer disabled:opacity-50",
                    s.isActive
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
                      : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  )}
                  aria-label={s.isActive ? "ปิดการใช้งาน" : "เปิดใช้งาน"}
                >
                  {togglingId === s.id ? (
                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        s.isActive ? "bg-emerald-500" : "bg-red-500"
                      )}
                    />
                  )}
                  {togglingId === s.id ? "กำลังเปลี่ยน..." : s.isActive ? "เปิด" : "ปิด"}
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(s)}
                    className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
                    aria-label="แก้ไข"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    disabled={deletingId === s.id}
                    className="rounded-xl border border-red-200 p-2.5 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    aria-label="ลบ"
                  >
                    {deletingId === s.id ? (
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <StaffModal
          tenantId={tenantId}
          staff={editingStaff}
          services={services}
          tenantDefaults={tenantDefaults}
          onClose={handleCloseModal}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
