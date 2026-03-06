"use client";

import type { Booking, BookingStatus } from "@/types";
import { formatThaiDate } from "@/lib/utils/formatThaiDate";
import { cn } from "@/lib/utils/cn";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  open: { label: "รอยืนยัน", className: "bg-amber-500/20 text-amber-400" },
  confirmed: { label: "ยืนยันแล้ว", className: "bg-emerald-500/20 text-emerald-400" },
  user_cancelled: {
    label: "ยกเลิกโดยลูกค้า",
    className: "bg-zinc-500/20 text-zinc-400",
  },
  admin_cancelled: {
    label: "ยกเลิกโดยร้าน",
    className: "bg-red-500/20 text-red-400",
  },
  completed: { label: "เสร็จสิ้น", className: "bg-slate-500/20 text-slate-400" },
};

export function getStatusConfig(status: BookingStatus): {
  label: string;
  className: string;
} {
  if (status === "confirmed") {
    return STATUS_CONFIG.confirmed;
  }
  return STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-zinc-500/20 text-zinc-400",
  };
}

export function getPastStatusConfig(status: BookingStatus): {
  label: string;
  className: string;
} {
  if (status === "confirmed") {
    return { label: "เสร็จสิ้น", className: "bg-blue-500/20 text-blue-400" };
  }
  return STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-zinc-500/20 text-zinc-400",
  };
}

interface BookingCardProps {
  booking: Booking;
  showCancelButton?: boolean;
  onCancel?: (booking: Booking) => void;
  variant?: "upcoming" | "past";
}

export function BookingCard({
  booking,
  showCancelButton = false,
  onCancel,
  variant = "upcoming",
}: BookingCardProps) {
  const config =
    variant === "past"
      ? getPastStatusConfig(booking.status)
      : getStatusConfig(booking.status);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-800/30 overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1",
              config.className
            )}
          >
            {config.label}
          </span>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">บริการ</p>
          <p className="text-white font-medium">{booking.serviceName}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">พนักงาน</p>
          <p className="text-white text-sm">
            {booking.staffId === "any" ? "ไม่ระบุ" : booking.staffName}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">วันที่</p>
          <p className="text-white text-sm">{formatThaiDate(booking.date)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">เวลา</p>
          <p className="text-white text-sm">{booking.startTime}</p>
        </div>
        {showCancelButton &&
          (booking.status === "open" || booking.status === "confirmed") &&
          onCancel && (
            <button
              type="button"
              onClick={() => onCancel(booking)}
              className="w-full mt-2 rounded-xl border border-red-500/50 text-red-400 py-2.5 text-sm font-medium hover:bg-red-500/10 active:scale-[0.98] transition"
            >
              ยกเลิกการจอง
            </button>
          )}
      </div>
    </div>
  );
}
