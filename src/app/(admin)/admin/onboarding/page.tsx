"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FloatingInput from "@/components/ui/FloatingInput";

const FIREBASE_TOKEN_KEY = "firebaseToken";

const BUSINESS_LABELS: Record<string, string> = {
  barbershop: "ร้านตัดผม",
  beauty_salon: "ร้านเสริมสวย",
  spa: "สปา",
  thai_massage: "นวดแผนไทย",
  aesthetic_clinic: "คลินิกความงาม",
  general_clinic: "คลินิกทั่วไป",
  dental_clinic: "ทันตกรรม",
  nail_salon: "ร้านทำเล็บ",
  fitness: "ฟิตเนส",
  pilates: "โยคะ",
  other: "อื่นๆ",
};

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [lineToken, setLineToken] = useState("");
  const [lineSecret, setLineSecret] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ token?: string; secret?: string }>({});

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FIREBASE_TOKEN_KEY)
        : null;
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((res) => {
        if (res.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.tenantId) {
          setTenantName(data.tenantName ?? "");
          setBusinessType(data.businessType ?? "");
        } else {
          router.replace("/admin/login");
        }
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});
    const trimmedToken = lineToken.trim();
    const trimmedSecret = lineSecret.trim();
    if (!trimmedToken || !trimmedSecret) {
      setFieldErrors({
        token: !trimmedToken ? "กรุณากรอก Line Channel Access Token" : undefined,
        secret: !trimmedSecret ? "กรุณากรอก Line Channel Secret" : undefined,
      });
      return;
    }
    setSubmitting(true);
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FIREBASE_TOKEN_KEY)
        : null;
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    try {
      const res = await fetch("/api/admin/tenant", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineChannelAccessToken: trimmedToken,
          lineChannelSecret: trimmedSecret,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSubmitError(json.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      router.push("/admin/dashboard");
    } catch {
      setSubmitError("เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-medium">
              ✓
            </div>
            <span className="text-sm font-medium text-slate-600">สร้างบัญชี</span>
          </div>
          <div className="w-12 h-0.5 bg-teal-600" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-medium">
              2
            </div>
            <span className="text-sm font-medium text-slate-900">ตั้งค่า Line OA</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-medium">
              3
            </div>
            <span className="text-sm font-medium text-slate-400">เริ่มใช้งาน</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">ยินดีต้อนรับ</h1>
            <p className="text-slate-500 mt-2">
              {tenantName && <span className="font-medium text-slate-700">{tenantName}</span>}
              {tenantName && businessType && " · "}
              {businessType && <span>{BUSINESS_LABELS[businessType] ?? businessType}</span>}
            </p>
          </div>

          <div className="space-y-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900">ตั้งค่า Line OA</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">
                    1
                  </span>
                  <a
                    href="https://manager.line.biz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    สร้าง Line OA
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-slate-600 ml-11">
                  ไปที่ Line Official Account Manager สมัครและสร้างแอคเคาต์ร้าน จากนั้นสร้างช่องทาง (Channel) ประเภท Messaging API
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">
                    2
                  </span>
                  <a
                    href="https://manager.line.biz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    เปิด Messaging API
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-slate-600 ml-11">
                  เข้าไปที่ช่องทางที่สร้างไว้ เลือกแท็บ Messaging API แล้วเปิดใช้งาน Messaging API
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">
                    3
                  </span>
                  <a
                    href="https://developers.line.biz/console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    Line Developers Console
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-slate-600 ml-11">
                  เปิด Line Developers Console เลือก Provider และ Channel ที่สร้างไว้ ไปที่แท็บ Messaging API คัดลอก Channel secret และออก Channel access token (long-lived) แล้วนำมาใส่ในฟอร์มด้านล่าง
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3"
              >
                {submitError}
              </div>
            )}
            <div>
              <FloatingInput
                label="Line Channel Access Token"
                type="text"
                value={lineToken}
                onChange={(v) => {
                  setLineToken(v);
                  if (fieldErrors.token) setFieldErrors((prev) => ({ ...prev, token: undefined }));
                }}
                required
              />
              {fieldErrors.token && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.token}</p>
              )}
            </div>
            <div>
              <FloatingInput
                label="Line Channel Secret"
                type="password"
                value={lineSecret}
                onChange={(v) => {
                  setLineSecret(v);
                  if (fieldErrors.secret) setFieldErrors((prev) => ({ ...prev, secret: undefined }));
                }}
                required
              />
              {fieldErrors.secret && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.secret}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-teal-600 py-3 px-4 font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกและเริ่มใช้งาน"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
