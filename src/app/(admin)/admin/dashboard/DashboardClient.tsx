"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
} from "recharts";
import { useBookings, useBookingStats } from "@/hooks/useBookings";
import { useStaff } from "@/hooks/useStaff";
import { updateBookingStatus } from "@/lib/firebase/bookings";
import { cn } from "@/lib/utils/cn";
import type { Booking, BookingStatus } from "@/types";
import { useToastStore } from "@/stores/toastStore";
import {
  Calendar,
  Clock,
  CheckCircle,
  Star,
  XCircle,
  TrendingUp,
  Plus,
  CalendarX2,
} from "lucide-react";

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

interface DashboardClientProps {
  tenantId: string;
}

function getLast7Days(): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function getLast6Months(): { month: string; revenue: number }[] {
  const out: { month: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      month: d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
      revenue: 0,
    });
  }
  return out;
}

export function DashboardClient({ tenantId }: DashboardClientProps) {
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<BookingStatus | "">("");
  const [filterStaffId, setFilterStaffId] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  console.log("Dashboard tenantId:", tenantId);

  const filters = useMemo(
    () => ({
      date: filterDate || undefined,
      status: filterStatus || undefined,
      staffId: filterStaffId || undefined,
    }),
    [filterDate, filterStatus, filterStaffId]
  );

  const { bookings, loading, error } = useBookings(tenantId, filters);
  const { stats, loading: statsLoading } = useBookingStats(tenantId);
  const { staffList } = useStaff(tenantId);
  const successToast = useToastStore((s) => s.success);
  const errorToast = useToastStore((s) => s.error);

  const volumeByDay = useMemo(() => {
    const days = getLast7Days();
    const countByDate: Record<string, number> = {};
    days.forEach((d) => (countByDate[d] = 0));
    bookings.forEach((b) => {
      if (countByDate[b.date] !== undefined) countByDate[b.date]++;
    });
    return days.map((date) => ({
      date: date.slice(5),
      count: countByDate[date] ?? 0,
    }));
  }, [bookings]);

  const revenueByMonth = useMemo(() => {
    const months = getLast6Months();
    const now = new Date();
    const revByMonth: Record<string, number> = {};
    months.forEach((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revByMonth[key] = 0;
    });
    bookings.forEach((b) => {
      const key = b.date.slice(0, 7);
      if (revByMonth[key] !== undefined && (b.status === "confirmed" || b.status === "open")) {
        revByMonth[key] += b.price ?? 0;
      }
    });
    return months.map((m, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { ...m, revenue: revByMonth[key] ?? 0 };
    });
  }, [bookings]);

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
    if (!b.remainingAmount || b.remainingAmount <= 0) {
      return;
    }
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

  if (!tenantId) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-slate-500">ไม่พบ tenant</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-white border border-slate-200 shadow-sm animate-shimmer" />
          ))
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-medium">จองวันนี้</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900">{stats.totalToday}</p>
              <p className="text-xs text-slate-400 mt-1">เทียบเดือนก่อน —</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium">รอยืนยัน</span>
              </div>
              <p className="text-2xl font-semibold text-amber-600">{stats.totalPending}</p>
              <p className="text-xs text-slate-400 mt-1">เทียบเดือนก่อน —</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium">ยืนยันแล้ว</span>
              </div>
              <p className="text-2xl font-semibold text-emerald-600">{stats.totalConfirmed}</p>
              <p className="text-xs text-slate-400 mt-1">เทียบเดือนก่อน —</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Star className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium">เสร็จสิ้น</span>
              </div>
              <p className="text-2xl font-semibold text-blue-600">{stats.totalCompleted}</p>
              <p className="text-xs text-slate-400 mt-1">เทียบเดือนก่อน —</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium">ยกเลิก</span>
              </div>
              <p className="text-2xl font-semibold text-slate-600">{stats.totalCancelled}</p>
              <p className="text-xs text-slate-400 mt-1">เทียบเดือนก่อน —</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium">รอรับชำระ</span>
              </div>
              <p className="text-2xl font-semibold text-amber-600">
                {stats.totalRemainingPending}
              </p>
              <p className="text-xs text-slate-400 mt-1">ยอดคงเหลือที่ยังไม่ชำระ</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-medium">รายได้เดือนนี้</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900">
                ฿{stats.revenueThisMonth.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">เทียบเดือนก่อน —</p>
            </div>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-slate-700 mb-4">การจอง 7 วันล่าสุด</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelStyle={{ color: "#0f172a" }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-slate-700 mb-4">รายได้ 6 เดือนล่าสุด</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [`฿${value.toLocaleString()}`, "รายได้"]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ fill: "#0d9488" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-2">จัดการจอง</h3>
        <p className="text-sm text-slate-500 mb-4">
          ย้ายรายการและการดำเนินการจองไปที่หน้าใหม่แล้ว เพื่อแยก Dashboard ให้ดูภาพรวมได้ง่ายขึ้น
        </p>
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          เปิดหน้า จัดการจอง
        </Link>
      </div>
    </div>
  );
}
