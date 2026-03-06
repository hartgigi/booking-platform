"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle,
  Copy,
} from "lucide-react";
import { useToastStore } from "@/stores/toastStore";

const SUPER_ADMIN_TOKEN_KEY = "superAdminToken";

interface PendingPayout {
  tenantId: string;
  tenantName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  promptPayNumber?: string;
  totalEarned: number;
  totalPaid: number;
  pendingAmount: number;
}

interface PayoutsResponse {
  payouts: PendingPayout[];
  totalPending: number;
  totalPaidThisMonth: number;
}

interface PaidPayout {
  id: string;
  tenantId: string;
  tenantName: string;
  totalAmount: number;
  note?: string;
  paidAt?: { _seconds?: number; toDate?: () => Date };
}

function formatMoney(value: number): string {
  return `฿${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(d?: { _seconds?: number; toDate?: () => Date }) {
  if (!d) return "-";
  let date: Date | null = null;
  if (typeof d.toDate === "function") date = d.toDate();
  else if (typeof d._seconds === "number") date = new Date(d._seconds * 1000);
  if (!date) return "-";
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PayoutsClient() {
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [paid, setPaid] = useState<PaidPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "paid">("pending");
  const [modal, setModal] = useState<PendingPayout | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const successToast = useToastStore((s) => s.success);
  const errorToast = useToastStore((s) => s.error);

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
    async function load() {
      try {
        setLoading(true);
        const [payoutRes, historyRes] = await Promise.all([
          fetch("/api/superadmin/payouts", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/api/superadmin/payouts-history", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }).catch(() => null),
        ]);
        if (!payoutRes.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        const payoutsData = (await payoutRes.json()) as PayoutsResponse;
        setData(payoutsData);
        if (historyRes && historyRes.ok) {
          const history = (await historyRes.json()) as PaidPayout[];
          setPaid(history);
        }
      } catch (err) {
        console.error(err);
        setError("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      successToast("คัดลอกแล้ว");
    } catch {
      errorToast("คัดลอกไม่สำเร็จ");
    }
  }

  async function handleConfirmPayout() {
    if (!modal) return;
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/superadmin/payouts/${modal.tenantId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: modal.pendingAmount,
            note,
          }),
        }
      );
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      successToast("บันทึกการโอนเงินสำเร็จ");
      setModal(null);
      setNote("");
      // reload payouts
      const payoutRes = await fetch("/api/superadmin/payouts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (payoutRes.ok) {
        const payoutsData = (await payoutRes.json()) as PayoutsResponse;
        setData(payoutsData);
      }
    } catch (err) {
      console.error(err);
      errorToast("บันทึกการโอนเงินไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const totalPending = data?.totalPending ?? 0;
  const totalPaidThisMonth = data?.totalPaidThisMonth ?? 0;

  return (
    <div className="p-6 md:p-8 text-white">
      <h1 className="text-2xl font-semibold mb-6">โอนเงินร้านค้า</h1>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <SummaryCard
              icon={AlertCircle}
              label="ยอดที่ต้องโอนทั้งหมด"
              value={formatMoney(totalPending)}
              className="bg-red-600"
            />
            <SummaryCard
              icon={CheckCircle}
              label="โอนแล้วเดือนนี้"
              value={formatMoney(totalPaidThisMonth)}
              className="bg-emerald-600"
            />
          </div>

          <div className="border-b border-zinc-800 mb-4">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`pb-2 text-sm font-medium ${
                  activeTab === "pending"
                    ? "border-b-2 border-amber-500 text-amber-400"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                รอโอน
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("paid")}
                className={`pb-2 text-sm font-medium ${
                  activeTab === "paid"
                    ? "border-b-2 border-amber-500 text-amber-400"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                โอนแล้ว
              </button>
            </div>
          </div>

          {activeTab === "pending" ? (
            <PendingTable
              payouts={data?.payouts ?? []}
              onCopy={handleCopy}
              onConfirm={(p) => setModal(p)}
            />
          ) : (
            <PaidTable payouts={paid} />
          )}

          {modal && (
            <ConfirmModal
              payout={modal}
              note={note}
              onNoteChange={setNote}
              onClose={() => {
                if (!saving) {
                  setModal(null);
                  setNote("");
                }
              }}
              onConfirm={handleConfirmPayout}
              saving={saving}
            />
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

function PendingTable({
  payouts,
  onCopy,
  onConfirm,
}: {
  payouts: PendingPayout[];
  onCopy: (text: string) => void;
  onConfirm: (p: PendingPayout) => void;
}) {
  if (payouts.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-12 text-center text-zinc-400">
        <CheckCircle className="w-10 h-10 mx-auto mb-4 text-emerald-400" />
        <p className="text-sm">ไม่มียอดค้างโอน 🎉</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs text-zinc-400">
                ร้านค้า
              </th>
              <th className="px-4 py-2 text-left text-xs text-zinc-400">
                ธนาคาร
              </th>
              <th className="px-4 py-2 text-left text-xs text-zinc-400">
                เลขบัญชี
              </th>
              <th className="px-4 py-2 text-left text-xs text-zinc-400">
                ชื่อบัญชี
              </th>
              <th className="px-4 py-2 text-left text-xs text-zinc-400">
                PromptPay
              </th>
              <th className="px-4 py-2 text-right text-xs text-zinc-400">
                ยอดต้องโอน
              </th>
              <th className="px-4 py-2 text-right text-xs text-zinc-400">
                การดำเนินการ
              </th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr
                key={p.tenantId}
                className="border-b border-zinc-800/80 hover:bg-zinc-800/60"
              >
                <td className="px-4 py-2 font-medium text-zinc-100">
                  {p.tenantName}
                </td>
                <td className="px-4 py-2 text-zinc-300">{p.bankName || "-"}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">
                      {p.bankAccountNumber || "-"}
                    </span>
                    {p.bankAccountNumber && (
                      <button
                        type="button"
                        onClick={() => onCopy(p.bankAccountNumber)}
                        className="inline-flex items-center justify-center rounded-full border border-zinc-600 p-1 text-zinc-300 hover:bg-zinc-700"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-zinc-300">
                  {p.bankAccountName || "-"}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">
                      {p.promptPayNumber || "-"}
                    </span>
                    {p.promptPayNumber && (
                      <button
                        type="button"
                        onClick={() => onCopy(p.promptPayNumber!)}
                        className="inline-flex items-center justify-center rounded-full border border-zinc-600 p-1 text-zinc-300 hover:bg-zinc-700"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="text-lg font-semibold text-red-400">
                    {formatMoney(p.pendingAmount)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onConfirm(p)}
                    className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500"
                  >
                    โอนแล้ว
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaidTable({ payouts }: { payouts: PaidPayout[] }) {
  if (payouts.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-12 text-center text-zinc-400">
        <p className="text-sm">ยังไม่มีรายการโอนเงิน</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs text-zinc-400">
                วันที่โอน
              </th>
              <th className="px-4 py-2 text-left text-xs text-zinc-400">
                ร้านค้า
              </th>
              <th className="px-4 py-2 text-right text-xs text-zinc-400">
                ยอดที่โอน
              </th>
              <th className="px-4 py-2 text-left text-xs text-zinc-400">
                หมายเหตุ
              </th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr
                key={p.id}
                className="border-b border-zinc-800/80 hover:bg-zinc-800/60"
              >
                <td className="px-4 py-2">{formatDate(p.paidAt)}</td>
                <td className="px-4 py-2 font-medium text-zinc-100">
                  {p.tenantName}
                </td>
                <td className="px-4 py-2 text-right">
                  {formatMoney(p.totalAmount)}
                </td>
                <td className="px-4 py-2 text-zinc-300">{p.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfirmModal({
  payout,
  note,
  onNoteChange,
  onClose,
  onConfirm,
  saving,
}: {
  payout: PendingPayout;
  note: string;
  onNoteChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm" />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl">
          <h2 className="text-lg font-semibold mb-4">ยืนยันการโอนเงิน</h2>
          <div className="space-y-3 text-sm">
            <p>
              ร้านค้า: <span className="font-medium">{payout.tenantName}</span>
            </p>
            <p>
              ยอดโอน:{" "}
              <span className="font-semibold text-teal-400">
                {formatMoney(payout.pendingAmount)}
              </span>
            </p>
            <p>
              บัญชี: {payout.bankName} {payout.bankAccountNumber}
            </p>
            <p>ชื่อบัญชี: {payout.bankAccountName}</p>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                หมายเหตุ (ไม่บังคับ)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                placeholder="เช่น โอนผ่าน SCB วันที่..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "ยืนยันว่าโอนแล้ว"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

