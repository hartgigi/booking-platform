"use client";

import { useEffect } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function readTenantBookingParams(searchParams: ReturnType<typeof useSearchParams>) {
  let tenantId = searchParams.get("tenantId");
  let rescheduleBookingId = searchParams.get("rescheduleBookingId");
  if (!tenantId || !rescheduleBookingId) {
    const liffState = searchParams.get("liff.state");
    if (liffState) {
      const liffParams = new URLSearchParams(liffState.replace(/^\?/, ""));
      tenantId = tenantId || liffParams.get("tenantId");
      rescheduleBookingId = rescheduleBookingId || liffParams.get("rescheduleBookingId");
    }
  }
  return { tenantId, rescheduleBookingId };
}

function StartPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    function run() {
      if (typeof window === "undefined") return;

      // Rich Menu / ลิงก์ LIFF แบบ ?tenantId=... เปิดที่ Endpoint /start — ต้องไปหน้าจองลูกค้า
      // ไม่ทำ admin/login fallback ที่นี่แล้ว เพื่อกันการวนเข้า LINE login โดยไม่จำเป็น
      const { tenantId: bookingTenantId, rescheduleBookingId } = readTenantBookingParams(searchParams);
      if (bookingTenantId) {
        if (rescheduleBookingId) {
          router.replace(`/booking/${bookingTenantId}/reschedule/${rescheduleBookingId}`);
        } else {
          router.replace(`/booking/${bookingTenantId}`);
        }
        return;
      }
      router.replace("/contact?from=start");
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-2">
        <p className="text-sm text-slate-400">กำลังตรวจสอบข้อมูลกับ LINE...</p>
        <p className="text-xs text-slate-500">
          หากหน้าจอไม่เปลี่ยน ให้ปิดแล้วเปิดลิงก์ใหม่จากเมนู LINE อีกครั้ง
        </p>
      </div>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={<div className="p-4">กำลังโหลด...</div>}>
      <StartPageClient />
    </Suspense>
  );
}


