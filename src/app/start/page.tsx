"use client";

import { useEffect } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JONGME_LIFF_ID } from "@/lib/line/liff";

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

    async function run() {
      if (typeof window === "undefined") return;

      // Rich Menu / ลิงก์ LIFF แบบ ?tenantId=... เปิดที่ Endpoint /start — ต้องไปหน้าจองลูกค้า
      // ไม่ใช่ flow เจ้าของร้าน → admin (มิฉะนั้นกด "จองคิว" จาก OA ร้านแล้วเด้ง dashboard)
      const { tenantId: bookingTenantId, rescheduleBookingId } = readTenantBookingParams(searchParams);
      if (bookingTenantId) {
        if (rescheduleBookingId) {
          router.replace(`/booking/${bookingTenantId}/reschedule/${rescheduleBookingId}`);
        } else {
          router.replace(`/booking/${bookingTenantId}`);
        }
        return;
      }

      try {
        const { default: liff } = await import("@line/liff");

        if (!(liff as any).isInitialized?.()) {
          await liff.init({
            liffId: JONGME_LIFF_ID,
            withLoginOnExternalBrowser: false,
          });
        }

        // ถ้ายังไม่ล็อกอิน LIFF (เช่น เปิดจากเบราว์เซอร์นอก LINE) ไม่เรียก liff.login() ที่อาจทำให้ได้ 400
        // ส่งไปหน้ารายการแพ็กเกจแทน ตาม flow: ยังไม่สมัคร → ให้มีรายการ Package ให้เลือก
        if (!liff.isLoggedIn()) {
          router.replace("/contact?from=start");
          return;
        }

        const profile = await liff.getProfile();
        if (!profile.userId || cancelled) return;

        const res = await fetch(
          `/api/tenants/by-line?lineUserId=${encodeURIComponent(
            profile.userId
          )}`
        );
        const data = await res.json();

        if (cancelled) return;

        // ถ้าเป็นร้านค้าที่สมัครแล้ว → ไปหน้าเข้าสู่ระบบ (อีเมล/รหัสผ่าน)
        if (data.exists && data.tenantId) {
          router.replace("/admin/login");
          return;
        }

        // ยังไม่สมัครแพ็กเกจ → ไปหน้ารายการแพ็กเกจ (ใช้ section เดิมใน /contact)
        router.replace(`/contact?from=start`);
      } catch (err) {
        console.error("StartPage LIFF flow error:", err);
        router.replace("/contact");
      }
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


