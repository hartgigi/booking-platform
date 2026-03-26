"use client";

import { useState, useEffect } from "react";
import { useToastStore } from "@/stores/toastStore";
import type { TenantSettings } from "./SettingsGuard";
import FloatingInput from "@/components/ui/FloatingInput";
import { FloatingTextarea } from "@/components/ui/FloatingInput";
import { cn } from "@/lib/utils/cn";
import { LineGuide } from "./LineGuide";

const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัส" },
  { value: 5, label: "ศุกร์" },
  { value: 6, label: "เสาร์" },
  { value: 0, label: "อาทิตย์" },
];

interface SettingsClientProps {
  tenant: TenantSettings;
}

const FIREBASE_TOKEN_KEY = "firebaseToken";

function buildLineWebhookUrl(tenantId: string): string {
  const base =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) ||
    "https://www.jongme.com";
  return `${base}/api/webhook/line/${tenantId}`;
}

export function SettingsClient({ tenant: initialTenant }: SettingsClientProps) {
  const lineWebhookUrl = buildLineWebhookUrl(initialTenant.id);
  const [name, setName] = useState(initialTenant.name);
  const [phone, setPhone] = useState(initialTenant.phone);
  const [address, setAddress] = useState(initialTenant.address);
  const [openTime, setOpenTime] = useState(initialTenant.openTime);
  const [closeTime, setCloseTime] = useState(initialTenant.closeTime);
  const [openDays, setOpenDays] = useState<number[]>(
    Array.isArray(initialTenant.openDays) ? initialTenant.openDays : [1, 2, 3, 4, 5, 6]
  );
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState(
    initialTenant.lineChannelAccessToken ?? ""
  );
  const [lineChannelSecret, setLineChannelSecret] = useState(
    initialTenant.lineChannelSecret ?? ""
  );
  const [depositMode, setDepositMode] = useState<"auto" | "manual">(
    initialTenant.depositMode ?? "manual"
  );
  const [bankName, setBankName] = useState(initialTenant.bankName ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(
    initialTenant.bankAccountNumber ?? ""
  );
  const [bankAccountName, setBankAccountName] = useState(
    initialTenant.bankAccountName ?? ""
  );
  const [promptPayNumber, setPromptPayNumber] = useState(
    initialTenant.promptPayNumber ?? ""
  );
  const [paymentValidationError, setPaymentValidationError] = useState<string | null>(null);
  const [creatingMenu, setCreatingMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingLine, setTestingLine] = useState(false);
  const [lineTestResult, setLineTestResult] = useState<
    { ok: boolean; message: string } | null
  >(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [lineGuideOpen, setLineGuideOpen] = useState(false);
  const success = useToastStore((s) => s.success);
  const errorToast = useToastStore((s) => s.error);

  useEffect(() => {
    setName(initialTenant.name);
    setPhone(initialTenant.phone);
    setAddress(initialTenant.address);
    setOpenTime(initialTenant.openTime ?? "09:00");
    setCloseTime(initialTenant.closeTime ?? "18:00");
    setOpenDays(Array.isArray(initialTenant.openDays) ? initialTenant.openDays : [1, 2, 3, 4, 5, 6]);
    setLineChannelAccessToken(initialTenant.lineChannelAccessToken ?? "");
    setLineChannelSecret(initialTenant.lineChannelSecret ?? "");
    setDepositMode(initialTenant.depositMode ?? "manual");
    setBankName(initialTenant.bankName ?? "");
    setBankAccountNumber(initialTenant.bankAccountNumber ?? "");
    setBankAccountName(initialTenant.bankAccountName ?? "");
    setPromptPayNumber(initialTenant.promptPayNumber ?? "");
  }, [
    initialTenant.id,
    initialTenant.name,
    initialTenant.phone,
    initialTenant.address,
    initialTenant.openTime,
    initialTenant.closeTime,
    initialTenant.openDays,
    initialTenant.lineChannelAccessToken,
    initialTenant.lineChannelSecret,
    initialTenant.depositMode,
    initialTenant.bankName,
    initialTenant.bankAccountNumber,
    initialTenant.bankAccountName,
    initialTenant.promptPayNumber,
  ]);

  function toggleDay(d: number) {
    setOpenDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  async function handleTestLine() {
    setLineTestResult(null);
    if (!lineChannelAccessToken.trim()) {
      setLineTestResult({
        ok: false,
        message: "❌ Token ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
      });
      return;
    }
    setTestingLine(true);
    try {
      const res = await fetch("/api/admin/line-test", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${lineChannelAccessToken.trim()}`,
        },
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        botName?: string;
        message?: string;
      };
      if (res.ok && data.ok) {
        setLineTestResult({
          ok: true,
          message: `✅ เชื่อมต่อสำเร็จ: ${data.botName ?? ""}`,
        });
      } else {
        setLineTestResult({
          ok: false,
          message:
            "❌ Token ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
        });
      }
    } catch {
      setLineTestResult({
        ok: false,
        message:
          "❌ Token ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
      });
    } finally {
      setTestingLine(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FIREBASE_TOKEN_KEY)
        : null;
    if (!token) return;

    if (depositMode === "auto") {
      const missingFields: string[] = [];
      if (!bankName.trim()) missingFields.push("ชื่อธนาคาร");
      if (!bankAccountNumber.trim()) missingFields.push("เลขบัญชี");
      if (!bankAccountName.trim()) missingFields.push("ชื่อบัญชี");
      if (!promptPayNumber.trim()) missingFields.push("เบอร์ PromptPay");

      if (missingFields.length > 0) {
        const msg = `โหมดตรวจสอบอัตโนมัติ ต้องกรอกข้อมูลรับเงินให้ครบ: ${missingFields.join(", ")}`;
        setPaymentValidationError(msg);
        errorToast(msg);
        return;
      }
    }

    setPaymentValidationError(null);
    setSaving(true);
    try {
      console.log("Saving bank settings:", {
        bankName,
        bankAccountNumber,
        bankAccountName,
        promptPayNumber,
        depositMode,
      });
      const res = await fetch("/api/admin/tenant", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          phone,
          address,
          openTime,
          closeTime,
          openDays,
          lineChannelAccessToken,
          lineChannelSecret,
          depositMode,
          bankName,
          bankAccountNumber,
          bankAccountName,
          promptPayNumber,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "บันทึกไม่สำเร็จ");
      }
      success("บันทึกข้อมูลสำเร็จ");
    } catch (err) {
      errorToast(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-24">
      <div className="p-6 max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">ตั้งค่าร้าน</h1>

        <div className="space-y-0">
        <section className="border-b border-slate-200 pb-6 mb-6">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">ข้อมูลร้าน</h2>
          <div className="space-y-4">
            <FloatingInput
              label="ชื่อร้าน"
              type="text"
              value={name}
              onChange={setName}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                เบอร์โทรติดต่อร้าน
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
              />
            </div>
            <FloatingTextarea
              label="ที่อยู่"
              value={address}
              onChange={setAddress}
              rows={3}
            />
          </div>
        </section>

        <section className="border-b border-slate-200 pb-6 mb-6 space-y-3">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            LINE OA ตั้งค่า
          </h2>
          <p className="text-xs text-slate-500">
            ใส่ Channel Access Token และ Channel Secret ของ LINE OA เพื่อให้ระบบสามารถส่งข้อความและสร้าง Rich Menu ได้
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Webhook URL (สำหรับตั้งค่าใน LINE Developers)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    readOnly
                    value={lineWebhookUrl}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 overflow-x-auto"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const url = lineWebhookUrl;
                    try {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        await navigator.clipboard.writeText(url);
                      }
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    } catch {
                      setCopiedWebhook(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-white hover:bg-slate-700 whitespace-nowrap"
                >
                  {copiedWebhook ? "✅ คัดลอกแล้ว" : "📋 คัดลอก"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                นำ URL นี้ไปวางที่ LINE Developers → Messaging API → Webhook URL แล้วกด Verify
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="flex flex-col gap-2">
                <FloatingTextarea
                  label="Channel Access Token"
                  value={lineChannelAccessToken}
                  onChange={(v) => {
                    setLineChannelAccessToken(v);
                    setLineTestResult(null);
                  }}
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-slate-500 flex-1">
                    วาง Channel Access Token ที่นี่
                  </p>
                  <button
                    type="button"
                    onClick={handleTestLine}
                    disabled={testingLine}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {testingLine ? "กำลังทดสอบ..." : "ทดสอบ"}
                  </button>
                </div>
                {lineTestResult && (
                  <p
                    className={
                      lineTestResult.ok
                        ? "text-emerald-500 text-xs"
                        : "text-red-500 text-xs"
                    }
                  >
                    {lineTestResult.message}
                  </p>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <FloatingInput
                label="Channel Secret"
                type="text"
                value={lineChannelSecret}
                onChange={setLineChannelSecret}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                วาง Channel Secret ที่นี่
              </p>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setLineGuideOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 shadow-sm"
            >
              <span>📖</span>
              <span>วิธีเชื่อมต่อ LINE OA</span>
            </button>
          </div>
        </section>

        <section className="border-b border-slate-200 pb-6 mb-6">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">เวลาทำการ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <FloatingInput
              label="เวลาเปิด"
              type="time"
              value={openTime}
              onChange={setOpenTime}
            />
            <FloatingInput
              label="เวลาปิด"
              type="time"
              value={closeTime}
              onChange={setCloseTime}
            />
          </div>
          <p className="text-sm text-slate-500 mb-2">วันที่เปิดให้บริการ</p>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleDay(value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  openDays.includes(value)
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <LineGuide
          open={lineGuideOpen}
          onClose={() => setLineGuideOpen(false)}
          webhookUrl={lineWebhookUrl}
        />

        <section className="border-b border-slate-200 pb-6 mb-6 space-y-4">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            การรับเงินมัดจำ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setDepositMode("manual")}
              className={cn(
                "flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left transition-all",
                depositMode === "manual"
                  ? "border-teal-500 bg-teal-50 shadow-sm"
                  : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="text-sm font-semibold text-slate-900">
                  ตรวจสอบเอง
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  ฟรี ไม่มีค่าธรรมเนียม
                </span>
              </div>
              <p className="text-xs text-slate-600">
                ลูกค้าจ่ายแล้วส่งสลิป คุณตรวจสอบและกดยืนยันเอง
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDepositMode("auto")}
              className={cn(
                "flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left transition-all",
                depositMode === "auto"
                  ? "border-teal-500 bg-teal-50 shadow-sm"
                  : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="text-sm font-semibold text-slate-900">
                  ตรวจสอบอัตโนมัติ
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  ค่าธรรมเนียม 4.65%
                </span>
              </div>
              <p className="text-xs text-slate-600">
                ระบบตรวจสอบการชำระเงินให้อัตโนมัติ ไม่ต้องทำอะไร
              </p>
              <p className="text-[11px] text-slate-500">
                ค่าธรรมเนียมจะบวกเพิ่มให้ลูกค้าจ่าย ร้านได้รับเงินเต็มจำนวน
              </p>
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-900">บัญชีรับเงิน</h3>
            <p className="text-xs text-slate-500">
              ข้อมูลนี้จะแสดงให้ลูกค้าเห็นตอนจ่ายมัดจำ (สำหรับโหมดตรวจสอบเอง)
            </p>
              {paymentValidationError && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">
                  {paymentValidationError}
                </div>
              )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อธนาคาร
                </label>
                <select
                  value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      if (paymentValidationError) setPaymentValidationError(null);
                    }}
                    className={cn(
                      "w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500",
                      depositMode === "auto" && !bankName.trim()
                        ? "border-red-300"
                        : "border-slate-200"
                    )}
                >
                  <option value="">เลือกธนาคาร</option>
                  <option value="กสิกรไทย">กสิกรไทย</option>
                  <option value="กรุงเทพ">กรุงเทพ</option>
                  <option value="ไทยพาณิชย์">ไทยพาณิชย์</option>
                  <option value="กรุงไทย">กรุงไทย</option>
                  <option value="ทหารไทยธนชาต">ทหารไทยธนชาต</option>
                  <option value="กรุงศรีอยุธยา">กรุงศรีอยุธยา</option>
                  <option value="ออมสิน">ออมสิน</option>
                </select>
              </div>
              <FloatingInput
                label="เลขบัญชี"
                type="text"
                value={bankAccountNumber}
                onChange={(v) => {
                  setBankAccountNumber(v);
                  if (paymentValidationError) setPaymentValidationError(null);
                }}
              />
              <FloatingInput
                label="ชื่อบัญชี"
                type="text"
                value={bankAccountName}
                onChange={(v) => {
                  setBankAccountName(v);
                  if (paymentValidationError) setPaymentValidationError(null);
                }}
              />
              <div>
                <FloatingInput
                  label="เบอร์ PromptPay"
                  type="text"
                  value={promptPayNumber}
                  onChange={(v) => {
                    setPromptPayNumber(v);
                    if (paymentValidationError) setPaymentValidationError(null);
                  }}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  เบอร์โทรศัพท์หรือเลขบัตรประชาชน
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 pb-6 mb-6 space-y-3">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            LINE OA
          </h2>
          <p className="text-xs text-slate-500">
            สร้างหรือรีเฟรช Rich Menu ของร้านนี้ หากลูกค้ากดเมนูแล้วเด้งหน้าเดิมหรือขึ้น 400 ให้กดปุ่มนี้
          </p>
          <button
            type="button"
            onClick={async () => {
              setCreatingMenu(true);
              try {
                const res = await fetch("/api/admin/rich-menu", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tenantId: initialTenant.id }),
                });
                const data = await res.json();
                if (data.success) {
                  success("สร้าง/รีเฟรช Rich Menu สำเร็จ");
                } else {
                  errorToast(
                    "ไม่สามารถสร้าง Rich Menu: " + (data.error || "unknown error")
                  );
                }
              } catch {
                errorToast("เกิดข้อผิดพลาดระหว่างสร้าง Rich Menu");
              } finally {
                setCreatingMenu(false);
              }
            }}
            disabled={creatingMenu}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
          >
            {creatingMenu
              ? "กำลังสร้าง..."
              : "📱 สร้าง/รีเฟรช Rich Menu สำหรับ LINE"}
          </button>
        </section>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-6">
          <p className="text-sm text-slate-600">
            วิธีรับแจ้งเตือนการจอง: แอดเพื่อนกับ Line OA ของร้านคุณ แล้วพิมพ์ว่า &quot;admin&quot; ระบบจะบันทึกไว้อัตโนมัติ
          </p>
        </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-[260px] border-t border-slate-200 bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            className="w-full rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
