"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const FIREBASE_TOKEN_KEY = "firebaseToken";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [tenantName, setTenantName] = useState("");
  const [plan, setPlan] = useState("trial");
  const [licenseExpiry, setLicenseExpiry] = useState<string | null>(null);
  const [showExpiryDialog, setShowExpiryDialog] = useState(false);
  const [forceUpgrade, setForceUpgrade] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FIREBASE_TOKEN_KEY)
        : null;
    if (!token) return;
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tenantName) setTenantName(data.tenantName);
        if (data?.plan) setPlan(data.plan);
        if (data?.licenseExpiry) {
          setLicenseExpiry(data.licenseExpiry);
          const exp = new Date(data.licenseExpiry).getTime();
          const now = Date.now();
          const diffDays = Math.floor((exp - now) / (24 * 60 * 60 * 1000));
          if (diffDays <= 7 && diffDays >= 0) {
            setShowExpiryDialog(true);
            setForceUpgrade(false);
          }
          if (exp <= now) {
            setShowExpiryDialog(true);
            setForceUpgrade(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 admin-theme">
      <AdminSidebar tenantName={tenantName} plan={plan} licenseExpiry={licenseExpiry} />
      <main className="lg:pl-[260px] pt-14 min-h-screen relative">
        {children}
        {showExpiryDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {forceUpgrade
                  ? "แพ็คเกจทดลองใช้งานหมดอายุแล้ว"
                  : "แพ็คเกจทดลองกำลังจะหมดอายุ"}
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                {forceUpgrade
                  ? "กรุณาเลือกแพ็คเกจเพื่อใช้งาน JongMe ต่อ ระบบจะไม่ให้ใช้งานหลังบ้านจนกว่าจะเลือกแพ็คเกจเรียบร้อย"
                  : "แพ็คเกจทดลองจะหมดอายุใน 7 วัน กรุณาเลือกแพ็คเกจเพื่อใช้งานต่ออย่างต่อเนื่อง"}
              </p>
              <div className="flex justify-end gap-3">
                {!forceUpgrade && (
                  <button
                    type="button"
                    onClick={() => setShowExpiryDialog(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    ปิด
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/admin/package";
                  }}
                  className="px-4 py-2 rounded-lg bg-teal-600 text-sm text-white font-medium hover:bg-teal-700"
                >
                  ไปหน้าแพ็คเกจ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
