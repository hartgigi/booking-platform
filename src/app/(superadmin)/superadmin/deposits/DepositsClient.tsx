"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Receipt,
  CreditCard,
  TrendingUp,
  Store,
} from "lucide-react";
import { useToastStore } from "@/stores/toastStore";

const SUPER_ADMIN_TOKEN_KEY = "superAdminToken";

interface DepositTransaction {
  id: string;
  tenantId: string;
  tenantName?: string;
  customerName?: string;
  serviceName?: string;
  amount: number;
  chargeAmount: number;
  omiseFee: number;
  shopReceiveAmount: number;
  superAdminReceiveAmount: number;
  mode: "auto" | "manual";
  status: "pending" | "completed" | "failed";
  createdAt?: { _seconds?: number; toDate?: () => Date };
}

interface DepositsResponse {
  transactions: DepositTransaction[];
  summary: {
    totalDeposits: number;
    totalOmiseFee: number;
    totalSuperAdminProfit: number;
    totalShopReceive: number;
    count: number;
  };
}

interface TenantOption {
  id: string;
  name: string;
}

function formatMoney(value: number): string {
  return `฿${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(d?: { _seconds?: number; toDate?: () => Date }) {
  if (!d) return "-";
  let date: Date | null = null;
  if (typeof d.toDate === "function") {
    date = d.toDate();
  } else if (typeof d._seconds === "number") {
    date = new Date(d._seconds * 1000);
  }
  if (!date) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DepositsClient() {
  const [transactions, setTransactions] = useState<DepositTransaction[]>([]);
  const [summary, setSummary] = useState<DepositsResponse["summary"] | null>(
    null
  );
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [tenantId, setTenantId] = useState<string>("");
  const [mode, setMode] = useState<string>("");
  const successToast = useToastStore((s) => s.success);
  const errorToast = useToastStore((s) => s.error);

  useEffect(() => {
    const now = new Date();
    setMonth(String(now.getMonth() + 1).padStart(2, "0"));
    setYear(String(now.getFullYear()));
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token) {
      setLoading(false);
      setError("ไม่พบสิทธิ์การเข้าใช้งาน");
      return;
    }
    // load tenants list for filter
    fetch("/api/superadmin/tenants", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        setTenants(
          data.map((t) => ({ id: t.id as string, name: (t.name as string) ?? "" }))
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token || !month || !year) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("month", String(Number(month)));
    params.set("year", year);
    if (tenantId) params.set("tenantId", tenantId);
    if (mode) params.set("mode", mode);
    fetch(`/api/superadmin/deposits?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("โหลดไม่สำเร็จ"))))
      .then((data: DepositsResponse) => {
        setTransactions(data.transactions ?? []);
        setSummary(data.summary);
      })
      .catch((err) => {
        console.error(err);
        setError("โหลดรายการมัดจำไม่สำเร็จ");
        errorToast("โหลดรายการมัดจำไม่สำเร็จ");
      })
      .finally(() => setLoading(false));
  }, [month, year, tenantId, mode, errorToast]);

  const monthOptions = useMemo(
    () => [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ],
    []
  );

  const yearOptions = useMemo(
    () => Array.from({ length: 7 }, (_, i) => 2024 + i),
    []
  );

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        acc.amount += Number(t.amount) || 0;
        acc.chargeAmount += Number(t.chargeAmount) || 0;
        acc.shopReceiveAmount += Number(t.shopReceiveAmount) || 0;
        acc.superAdminReceiveAmount += Number(t.superAdminReceiveAmount) || 0;
        return acc;
      },
      {
        amount: 0,
        chargeAmount: 0,
        shopReceiveAmount: 0,
        superAdminReceiveAmount: 0,
      }
    );
  }, [transactions]);

  return (
    <div className="p-6 md:p-8 text-white">
      <h1 className="text-2xl font-semibold mb-6">รายการมัดจำทั้งหมด</h1>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-zinc-900 animate-pulse"
              />
            ))}
          </div>
          <div className="h-10 rounded-2xl bg-zinc-900 animate-pulse" />
          <div className="h-64 rounded-2xl bg-zinc-900 animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              icon={Receipt}
              label="ยอดมัดจำเดือนนี้"
              value={formatMoney(summary?.totalDeposits ?? 0)}
              className="bg-teal-600"
            />
            <SummaryCard
              icon={CreditCard}
              label="ค่าธรรมเนียม Omise"
              value={formatMoney(summary?.totalOmiseFee ?? 0)}
              className="bg-red-600"
            />
            <SummaryCard
              icon={TrendingUp}
              label="กำไร Super Admin"
              value={formatMoney(summary?.totalSuperAdminProfit ?? 0)}
              className="bg-emerald-600"
            />
            <SummaryCard
              icon={Store}
              label="ร้านค้าต้องได้รับ"
              value={formatMoney(summary?.totalShopReceive ?? 0)}
              className="bg-sky-600"
            />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 mb-4">
            <div className="flex flex-wrap gap-3">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              >
                {monthOptions.map((label, idx) => (
                  <option key={idx} value={String(idx + 1).padStart(2, "0")}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm min-w-[160px]"
              >
                <option value="">ร้านค้าทั้งหมด</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              >
                <option value="">ทุก mode</option>
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm p-4 mb-4">
              {error}
            </div>
          )}

          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-12 text-center text-zinc-400">
              <Receipt className="w-10 h-10 mx-auto mb-4 text-zinc-500" />
              <p className="text-sm">ยังไม่มีรายการมัดจำ</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900 border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-zinc-400">
                        วันที่
                      </th>
                      <th className="px-4 py-2 text-left text-xs text-zinc-400">
                        ร้านค้า
                      </th>
                      <th className="px-4 py-2 text-left text-xs text-zinc-400">
                        ลูกค้า
                      </th>
                      <th className="px-4 py-2 text-left text-xs text-zinc-400">
                        บริการ
                      </th>
                      <th className="px-4 py-2 text-right text-xs text-zinc-400">
                        ค่ามัดจำ
                      </th>
                      <th className="px-4 py-2 text-right text-xs text-zinc-400">
                        ค่าธรรมเนียม
                      </th>
                      <th className="px-4 py-2 text-right text-xs text-zinc-400">
                        ร้านได้รับ
                      </th>
                      <th className="px-4 py-2 text-right text-xs text-zinc-400">
                        กำไร
                      </th>
                      <th className="px-4 py-2 text-center text-xs text-zinc-400">
                        Mode
                      </th>
                      <th className="px-4 py-2 text-center text-xs text-zinc-400">
                        สถานะ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-zinc-800/80 hover:bg-zinc-800/60"
                      >
                        <td className="px-4 py-2">
                          {formatDateTime(t.createdAt)}
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-medium text-zinc-100">
                            {t.tenantName || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {t.customerName || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {t.serviceName || "-"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatMoney(t.amount || 0)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatMoney(t.chargeAmount || 0)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatMoney(t.shopReceiveAmount || 0)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatMoney(t.superAdminReceiveAmount || 0)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              t.mode === "auto"
                                ? "bg-teal-500/20 text-teal-300"
                                : "bg-zinc-700/40 text-zinc-200"
                            }`}
                          >
                            {t.mode === "auto" ? "Auto" : "Manual"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              t.status === "completed"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : t.status === "pending"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                          >
                            {t.status === "completed"
                              ? "สำเร็จ"
                              : t.status === "pending"
                              ? "รอดำเนินการ"
                              : "ล้มเหลว"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-900/80">
                    <tr>
                      <td
                        className="px-4 py-2 text-right text-xs text-zinc-400"
                        colSpan={4}
                      >
                        รวม
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatMoney(totals.amount)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatMoney(totals.chargeAmount)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatMoney(totals.shopReceiveAmount)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatMoney(totals.superAdminReceiveAmount)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-80">{label}</span>
        <Icon className="w-4 h-4 opacity-80" />
      </div>
      <div className="text-lg md:text-xl font-semibold">{value}</div>
    </div>
  );
}

