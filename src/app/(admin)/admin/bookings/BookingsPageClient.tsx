"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useBookings } from "@/hooks/useBookings";
import { useStaff } from "@/hooks/useStaff";
import { updateBookingStatus } from "@/lib/firebase/bookings";
import { cn } from "@/lib/utils/cn";
import type { Booking, BookingStatus } from "@/types";
import { useToastStore } from "@/stores/toastStore";
import { Plus, CalendarX2 } from "lucide-react";

const STATUS_LABELS: Record<BookingStatus, string> = {
  open: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  user_cancelled: "ยกเลิก (ลูกค้า)",
  admin_cancelled: "ยกเลิก (ร้าน)",
  completed: "เสร็จสิ้น",
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  user_cancelled: "bg-slate-100 text-slate-600",
  admin_cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
};

const STATUS_DOT: Record<BookingStatus, string> = {
  open: "bg-amber-500",
  confirmed: "bg-emerald-500",
  user_cancelled: "bg-slate-400",
  admin_cancelled: "bg-red-500",
  completed: "bg-blue-500",
};

function getInitials(name: string) {
  if (!name || !name.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface BookingsPageClientProps {
  tenantId: string;
}

export function BookingsPageClient({ tenantId }: BookingsPageClientProps) {
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<BookingStatus | "">("");
  const [filterStaffId, setFilterStaffId] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      date: filterDate || undefined,
      status: filterStatus || undefined,
      staffId: filterStaffId || undefined,
    }),
    [filterDate, filterStatus, filterStaffId]
  );

  const { bookings, loading, error } = useBookings(tenantId, filters);
  const { staffList } = useStaff(tenantId);
  const successToast = useToastStore((s) => s.success);
  const errorToast = useToastStore((s) => s.error);

  async function handleConfirm(b: Booking) {
    setActingId(b.id);
    try {
      await updateBookingStatus(tenantId, b.id, "confirmed");
      await fetch(`/api/admin/bookings/${b.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActingId(null);
    }
  }

  async function handleCancel(b: Booking) {
    setActingId(b.id);
    try {
      await updateBookingStatus(tenantId, b.id, "admin_cancelled");
      await fetch(`/api/admin/bookings/${b.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "admin_cancelled" }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActingId(null);
    }
  }

  async function handleComplete(b: Booking) {
    if (!b.remainingAmount || b.remainingAmount <= 0) return;
    const ok = window.confirm(
      `ยืนยันว่าได้รับชำระเงินส่วนที่เหลือ ฿${b.remainingAmount.toLocaleString()} แล้ว?`
    );
    if (!ok) return;
    setActingId(b.id);
    try {
      await updateBookingStatus(tenantId, b.id, "completed");
      successToast("บันทึกการรับชำระเงินครบแล้ว");
    } catch (err) {
      console.error(err);
      errorToast("ไม่สามารถบันทึกการรับชำระได้");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus((e.target.value || "") as BookingStatus | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
        >
          <option value="">ทุกสถานะ</option>
          <option value="open">รอยืนยัน</option>
          <option value="confirmed">ยืนยันแล้ว</option>
          <option value="completed">เสร็จสิ้น</option>
          <option value="user_cancelled">ยกเลิก (ลูกค้า)</option>
          <option value="admin_cancelled">ยกเลิก (ร้าน)</option>
        </select>
        <select
          value={filterStaffId}
          onChange={(e) => setFilterStaffId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
        >
          <option value="">ทุกพนักงาน</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-4 mb-4">
          {error.message}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-lg animate-shimmer bg-slate-100" />
            ))}
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-teal-100 mb-6">
            <CalendarX2 className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">ไม่มีการจองที่ตรงกับตัวกรอง</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
            ลองเปลี่ยนวันที่ สถานะ หรือพนักงาน เพื่อดูรายการจอง
          </p>
          <Link
            href="/admin/services"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 shadow-md shadow-teal-900/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            ไปที่บริการ
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4">เวลา</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4">ลูกค้า</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4 hidden sm:table-cell">บริการ</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4 hidden md:table-cell">พนักงาน</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4 hidden lg:table-cell">มัดจำ</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4 hidden lg:table-cell">คงเหลือ</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider p-4">สถานะ</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider p-4">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-100 hover:bg-teal-50/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="p-4">
                      <span className="text-slate-900 font-medium">{b.date}</span>
                      <span className="text-slate-500 ml-1">{b.startTime}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {getInitials(b.customerName)}
                        </div>
                        <span className="text-slate-600">{b.customerName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 hidden sm:table-cell">{b.serviceName}</td>
                    <td className="p-4 text-slate-600 hidden md:table-cell">{b.staffName}</td>
                    <td className="p-4 text-slate-600 hidden lg:table-cell">
                      {b.depositAmount && b.depositAmount > 0 ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            b.depositStatus === "paid" || b.depositStatus === "verified"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          ฿{b.depositAmount.toLocaleString()}{" "}
                          {b.depositStatus === "paid" || b.depositStatus === "verified"
                            ? "จ่ายแล้ว"
                            : "รอตรวจสอบ"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">ไม่มี</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 hidden lg:table-cell">
                      {b.remainingAmount && b.remainingAmount > 0 ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            b.remainingStatus === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          ฿{b.remainingAmount.toLocaleString()}{" "}
                          {b.remainingStatus === "paid" ? "ชำระครบ" : "รอชำระ"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">ไม่มี</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CLASS[b.status])}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[b.status])} />
                        {STATUS_LABELS[b.status]}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {b.status === "open" && (
                          <button
                            type="button"
                            onClick={() => handleConfirm(b)}
                            disabled={actingId === b.id}
                            className="rounded-lg border border-teal-600 bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {actingId === b.id ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : null}
                            {actingId === b.id ? "กำลังดำเนินการ..." : "ยืนยัน"}
                          </button>
                        )}
                        {(b.status === "open" || b.status === "confirmed") && (
                          <button
                            type="button"
                            onClick={() => handleCancel(b)}
                            disabled={actingId === b.id}
                            className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                          >
                            {actingId === b.id ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : null}
                            {actingId === b.id ? "กำลังดำเนินการ..." : "ยกเลิก"}
                          </button>
                        )}
                        {b.status === "completed" &&
                          b.depositAmount > 0 &&
                          b.remainingAmount > 0 &&
                          b.remainingStatus === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleComplete(b)}
                              disabled={actingId === b.id}
                              className="rounded-lg border border-emerald-500 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-1"
                            >
                              {actingId === b.id ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : null}
                              {actingId === b.id ? "กำลังดำเนินการ..." : "รับชำระครบแล้ว"}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

