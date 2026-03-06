"use client";

import { useState, useEffect, useMemo } from "react";

const SUPER_ADMIN_TOKEN_KEY = "superAdminToken";

interface PaymentRow {
  id: string;
  tenantId: string;
  tenantName: string;
  packageName: string;
  amount: number;
  method: "Stripe" | "Manual";
  createdAt: string;
  status: string;
}

export function PaymentsClient() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const now = useMemo(() => new Date(), []);
  const monthOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    for (let i = 1; i <= 12; i++) {
      const v = String(i).padStart(2, "0");
      out.push({
        value: v,
        label: new Date(2000, i - 1, 1).toLocaleDateString("th-TH", {
          month: "short",
        }),
      });
    }
    return out;
  }, []);
  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y, y - 1, y - 2].map((v) => ({ value: String(v), label: String(v) }));
  }, [now]);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token) return;
    const params = new URLSearchParams();
    if (filterMonth) params.set("month", filterMonth);
    if (filterYear) params.set("year", filterYear);
    const q = params.toString();
    fetch(`/api/superadmin/payments${q ? `?${q}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("โหลดไม่สำเร็จ"))))
      .then((data) => {
        setPayments(data.payments ?? []);
        setTotalRevenue(data.totalRevenue ?? 0);
      })
      .catch((err) => setError(err?.message ?? "โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [filterMonth, filterYear]);

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

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-white mb-6">การชำระเงิน</h1>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 mb-6">
        <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">
          รายได้รวม{filterMonth || filterYear ? " (ตามตัวกรอง)" : ""}
        </p>
        <p className="text-2xl font-semibold text-white">
          ฿{totalRevenue.toLocaleString()}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
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

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  ร้านค้า
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  แพ็คเกจ
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  จำนวนเงิน
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  วิธีชำระ
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  วันที่
                </th>
                <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider p-3">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={`${p.tenantId}-${p.id}`}
                  className="border-b border-zinc-800/80 hover:bg-zinc-800/30"
                >
                  <td className="p-3 text-white font-medium">{p.tenantName}</td>
                  <td className="p-3 text-zinc-400">{p.packageName}</td>
                  <td className="p-3 text-zinc-400">
                    ฿{p.amount.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        p.method === "Stripe"
                          ? "text-emerald-400"
                          : "text-zinc-400"
                      }
                    >
                      {p.method}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400">
                    {new Date(p.createdAt).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3 text-zinc-400 capitalize">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && (
          <div className="p-8 text-center text-zinc-500">ไม่พบรายการชำระเงิน</div>
        )}
      </div>
    </div>
  );
}
