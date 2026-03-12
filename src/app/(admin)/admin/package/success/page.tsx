"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function PackageSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-emerald-600 text-3xl">✓</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          ชำระเงินสำเร็จแล้ว
        </h1>
        <p className="text-slate-600 text-sm mb-4">
          ระบบได้เปิดใช้งานแพ็คเกจให้ร้านของคุณเรียบร้อยแล้ว
        </p>
        {sessionId && (
          <p className="text-xs text-slate-400 mb-4">
            รหัสอ้างอิงการชำระเงิน: {sessionId}
          </p>
        )}
        <button
          type="button"
          onClick={() => router.push("/admin/login?registered=true")}
          className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 text-sm"
        >
          ไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { PackageSuccessClient } from "./PackageSuccessClient";

export default function PackageSuccessPage() {
  return (
    <Suspense fallback={<div className="p-4">กำลังโหลด...</div>}>
      <PackageSuccessClient />
    </Suspense>
  );
}
