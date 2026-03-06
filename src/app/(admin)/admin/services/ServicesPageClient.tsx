"use client";

import { useState, useMemo } from "react";
import { useServices } from "@/hooks/useServices";
import {
  deleteService,
  toggleServiceStatus,
} from "@/lib/firebase/services";
import ServiceModal from "@/components/admin/ServiceModal";
import { cn } from "@/lib/utils/cn";
import type { Service } from "@/types";
import { Plus, Scissors, Pencil, Trash2 } from "lucide-react";

const PAGE_SIZE = 10;

interface ServicesPageClientProps {
  tenantId: string;
}

export function ServicesPageClient({ tenantId }: ServicesPageClientProps) {
  const { services, loading, error } = useServices(tenantId);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return [...services];
    const q = search.trim().toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, search]);

  const sorted = useMemo(() => {
    const list = [...filtered].sort((a, b) =>
      sortAsc
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );
    return list;
  }, [filtered, sortAsc]);

  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const activeCount = useMemo(() => services.filter((s) => s.isActive).length, [services]);

  function handleEdit(s: Service) {
    console.log("Service passed to modal:", s);
    setEditingService(s);
    setModalOpen(true);
  }

  function handleAdd() {
    setEditingService(null);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingService(null);
  }

  async function handleToggle(s: Service) {
    try {
      await toggleServiceStatus(tenantId, s.id);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(s: Service) {
    if (!confirm(`ต้องการลบบริการ "${s.name}" ใช่หรือไม่?`)) return;
    setDeletingId(s.id);
    try {
      await deleteService(tenantId, s.id);
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
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            บริการ
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            จัดการบริการของร้านคุณ
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#0D9488] to-[#0891B2] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-teal-900/25 hover:shadow-xl hover:shadow-teal-900/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          เพิ่มบริการ
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="service-search" className="block text-sm font-medium text-slate-700 mb-1.5">
          ค้นหา
        </label>
        <input
          id="service-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อบริการ..."
          className="w-full max-w-xs px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-4 mb-6">
          {error.message}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-slate-200 bg-white card-shadow animate-shimmer" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center card-shadow">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-100 mb-6">
            <Scissors className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {search.trim() ? "ไม่พบบริการที่ตรงกับคำค้น" : "ยังไม่มีบริการ"}
          </h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
            {search.trim()
              ? "ลองเปลี่ยนคำค้นหรือล้างการค้นหา"
              : "เพิ่มบริการแรกเพื่อให้ลูกค้าสามารถจองได้"}
          </p>
          {!search.trim() && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#0D9488] to-[#0891B2] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-teal-900/25 hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              เพิ่มบริการแรก
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              ทั้งหมด {services.length} รายการ
            </span>
            <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
              เปิดใช้งาน {activeCount} รายการ
            </span>
          </div>
          <div className="space-y-3">
            {paginated.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap sm:flex-nowrap items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 card-shadow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-linear-to-r from-[#0D9488] to-[#0891B2] flex items-center justify-center shrink-0 text-white shadow-md">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Scissors className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900">{s.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {s.durationMinutes} นาที
                    </span>
                    <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      ฿{s.price.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                      s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", s.isActive ? "bg-emerald-500" : "bg-slate-400")} />
                    {s.isActive ? "เปิด" : "ปิด"}
                  </span>
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
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-500">
                แสดง {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, sorted.length)} จาก {sorted.length}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
                >
                  ก่อนหน้า
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <ServiceModal
          tenantId={tenantId}
          service={editingService}
          onClose={handleCloseModal}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
