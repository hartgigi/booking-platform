"use client";

import { useEffect } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function StartPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (typeof window === "undefined") return;
      try {
        const { default: liff } = await import("@line/liff");

        if (!(liff as any).isInitialized?.()) {
          await liff.init({ liffId: "2009324540-weVbZ1eR" });
        }

        if (!liff.isLoggedIn()) {
          // กลับมาหน้าเดิมหลังล็อกอิน
          liff.login({ redirectUri: window.location.href });
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

        // ถ้าเป็นร้านค้าที่สมัครแล้ว → ไปหน้าเข้าสู่ระบบ
        if (data.exists && data.tenantId) {
          const qs = new URLSearchParams(
            Object.fromEntries(searchParams.entries())
          );
          qs.set("from", "line");
          qs.set("tenantId", data.tenantId as string);
          router.replace(`/admin/login?${qs.toString()}`);
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


