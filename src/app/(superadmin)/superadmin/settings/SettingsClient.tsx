"use client";

import { useEffect, useState } from "react";
import { useToastStore } from "@/stores/toastStore";
import FloatingInput from "@/components/ui/FloatingInput";

const SUPER_ADMIN_TOKEN_KEY = "superAdminToken";

interface ChargeConfig {
  omiseFeePercent: number;
  additionalFeePercent: number;
  chargePercent: number;
}

export function SettingsClient() {
  const [config, setConfig] = useState<ChargeConfig | null>(null);
  const [additionalFee, setAdditionalFee] = useState<string>("1.0");
  const [loading, setLoading] = useState(true);
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
      return;
    }
    setLoading(true);
    fetch("/api/superadmin/charge-config", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("โหลดไม่สำเร็จ"))))
      .then((data: ChargeConfig) => {
        setConfig(data);
        setAdditionalFee(String(data.additionalFeePercent ?? 1.0));
      })
      .catch((err) => {
        console.error(err);
        errorToast("โหลดค่าธรรมเนียมไม่สำเร็จ");
      })
      .finally(() => setLoading(false));
  }, [errorToast]);

  const omiseFee = config?.omiseFeePercent ?? 3.65;
  const additional = Number.isFinite(Number(additionalFee))
    ? Number(additionalFee)
    : 0;
  const total = omiseFee + (Number.isFinite(additional) ? additional : 0);

  async function handleSave() {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/charge-config", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ additionalFeePercent: Number(additional) || 0 }),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      const data = (await res.json()) as ChargeConfig;
      setConfig(data);
      successToast("บันทึกค่าธรรมเนียมสำเร็จ");
    } catch (err) {
      console.error(err);
      errorToast("บันทึกค่าธรรมเนียมไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-zinc-800" />
          <div className="h-32 rounded-xl bg-zinc-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 text-white">
      <h1 className="text-2xl font-semibold mb-6">ตั้งค่าระบบ</h1>

      <div className="max-w-xl space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
          <h2 className="text-sm font-medium text-zinc-200">
            ค่าธรรมเนียมการชำระเงิน
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                ค่าธรรมเนียม Omise
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={`${omiseFee.toFixed(2)}%`}
                  disabled
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 pr-10 text-sm text-zinc-300"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-zinc-500">
                  🔒
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                ค่าธรรมเนียมจาก Omise (ไม่สามารถแก้ไขได้)
              </p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                ค่าธรรมเนียมเพิ่มเติม (กำไร)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={additionalFee}
                  onChange={(e) => setAdditionalFee(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                />
                <span className="text-sm text-zinc-400 shrink-0">%</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                ส่วนต่างที่จะเข้าบัญชี Super Admin
              </p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                ค่าธรรมเนียมรวมที่ลูกค้าจ่าย
              </label>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <p className="text-2xl font-semibold text-teal-400">
                  {total.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 leading-relaxed">
            ตัวอย่าง: ค่ามัดจำ ฿100 → ลูกค้าจ่าย ฿
            {(100 * (1 + total / 100)).toFixed(2)} → Omise ได้ ฿
            {(100 * (omiseFee / 100)).toFixed(2)} → คุณได้ ฿
            {(100 * (additional / 100)).toFixed(2)} → ร้านค้าได้ ฿100
          </div>
        </section>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  );
}

