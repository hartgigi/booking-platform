"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, signInWithAdminCustomToken } from "@/lib/firebase/auth";
import FloatingInput from "@/components/ui/FloatingInput";
import {
  LayoutGrid,
  Bell,
  BarChart3,
} from "lucide-react";

const schema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const registered = searchParams.get("registered") === "true";
  const tenantIdFromQuery = searchParams.get("tenantId") || "";
  const fromLine = searchParams.get("from") === "line";
  const autoLineLoginDone = useRef(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // หลังกลับจาก LINE login มาที่ /start แล้วถูกส่งมาหน้า login — ถ้า LIFF login แล้วให้เข้าสู่ระบบด้วย LINE อัตโนมัติ
  useEffect(() => {
    if (!fromLine || autoLineLoginDone.current || typeof window === "undefined")
      return;
    let cancelled = false;
    (async () => {
      try {
        const { default: liff } = await import("@line/liff");
        if (!(liff as any).isInitialized?.()) {
          await liff.init({ liffId: "2009324540-weVbZ1eR" });
        }
        if (cancelled || !liff.isLoggedIn()) return;
        autoLineLoginDone.current = true;
        const profile = await liff.getProfile();
        if (!profile.userId || cancelled) return;
        let tenantId = tenantIdFromQuery;
        if (!tenantId) {
          const byLineRes = await fetch(
            `/api/tenants/by-line?lineUserId=${encodeURIComponent(profile.userId)}`
          );
          const byLineData = await byLineRes.json();
          if (byLineData.exists && byLineData.tenantId) tenantId = byLineData.tenantId;
        }
        if (!tenantId || cancelled) return;
        const res = await fetch("/api/auth/line-admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineUserId: profile.userId, tenantId }),
        });
        if (!res.ok || cancelled) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || "ไม่สามารถเข้าสู่ระบบด้วย LINE ได้");
          return;
        }
        const data = await res.json();
        const customToken = data.customToken as string;
        const userCredential = await signInWithAdminCustomToken(customToken);
        const idToken = await userCredential.user.getIdToken();
        window.localStorage.setItem("firebaseToken", idToken);
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          cache: "no-store",
        });
        router.push("/admin/dashboard");
      } catch (e) {
        if (!cancelled) {
          console.error("Auto LINE login error:", e);
          setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromLine, tenantIdFromQuery, router]);

  async function handleLineLogin() {
    setError(null);
    try {
      const { default: liff } = await import("@line/liff");
      if (!(liff as any).isInitialized?.()) {
        await liff.init({ liffId: "2009324540-weVbZ1eR" });
      }
      if (!liff.isLoggedIn()) {
        const { getLiffLoginRedirectUri } = await import("@/lib/line/liff");
        liff.login({ redirectUri: getLiffLoginRedirectUri() });
        return;
      }
      const profile = await liff.getProfile();
      if (!profile.userId) {
        setError("ไม่สามารถอ่านข้อมูล LINE ได้ กรุณาลองใหม่");
        return;
      }
      // ถ้า URL ไม่มี tenantId (เช่น เปิดจาก bookmark หรือ redirect หลุด) ให้ดึงจาก by-line
      let tenantId = tenantIdFromQuery;
      if (!tenantId) {
        const byLineRes = await fetch(
          `/api/tenants/by-line?lineUserId=${encodeURIComponent(profile.userId)}`
        );
        const byLineData = await byLineRes.json();
        if (byLineData.exists && byLineData.tenantId) {
          tenantId = byLineData.tenantId;
        }
      }
      if (!tenantId) {
        setError(
          "ไม่พบร้านที่สมัครกับบัญชี LINE นี้ กรุณาเริ่มจากปุ่ม \"เริ่มต้นใช้งาน\" ในเมนู LINE หรือสมัครแพ็กเกจก่อน"
        );
        return;
      }
      const res = await fetch("/api/auth/line-admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: profile.userId,
          tenantId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error || "ไม่สามารถเข้าสู่ระบบด้วย LINE ได้ กรุณาลองใหม่"
        );
        return;
      }
      const data = await res.json();
      const customToken = data.customToken as string;
      const userCredential = await signInWithAdminCustomToken(customToken);
      const idToken = await userCredential.user.getIdToken();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("firebaseToken", idToken);
      }
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      });
      router.push("/admin/dashboard");
    } catch (err) {
      console.error("LINE admin login error:", err);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE");
    }
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const userCredential = await signIn(data.email, data.password);
      const idToken = await userCredential.user.getIdToken();
      const superAdminRes = await fetch("/api/superadmin/verify", {
        headers: { Authorization: "Bearer " + idToken },
      });
      if (superAdminRes.ok) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("superAdminToken", idToken);
        }
        router.push("/superadmin/dashboard");
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("firebaseToken", idToken);
      }
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        cache: "no-store",
      });
      router.push("/admin/dashboard");
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
      const message =
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "เกิดข้อผิดพลาด";
      setError(message);
    }
  }

  return (
    <div className="min-h-screen flex animate-fade-in">
      <div className="hidden lg:flex lg:w-[60%] flex-col justify-between bg-linear-to-br from-teal-600 to-cyan-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-size-[24px_24px]" />
        <div className="relative z-10 p-12 flex flex-col items-center justify-center flex-1">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            JongMe
          </h1>
          <p className="text-white/90 text-lg mb-16">
            ระบบจัดการการจองอัจฉริยะ
          </p>
          <ul className="space-y-6 text-white/95">
            <li className="flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span>จัดการง่าย</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2">
                <Bell className="w-5 h-5" />
              </div>
              <span>แจ้งเตือนอัตโนมัติ</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span>รายงานครบถ้วน</span>
            </li>
          </ul>
        </div>
        <div className="relative z-10 p-8 flex gap-4 justify-center">
          <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-white text-sm animate-fade-in">
            <span className="text-white/70">จองวันนี้</span>
            <p className="font-semibold text-lg">12</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-white text-sm animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="text-white/70">รายได้เดือนนี้</span>
            <p className="font-semibold text-lg">฿24,500</p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[360px] animate-scale-in">
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">
            เข้าสู่ระบบ
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            เข้าสู่ระบบเพื่อจัดการร้านค้าของคุณ
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {registered && (
              <div
                role="status"
                className="rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-sm px-4 py-3"
              >
                สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3"
              >
                {error}
              </div>
            )}
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <div>
                  <FloatingInput
                    label="อีเมล"
                    type="email"
                    value={field.value}
                    onChange={field.onChange}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
              )}
            />
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <div>
                  <FloatingInput
                    label="รหัสผ่าน"
                    type="password"
                    value={field.value}
                    onChange={field.onChange}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>
              )}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-teal-600 py-3 px-4 font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleLineLogin}
              className="w-full rounded-lg border border-[#00B900] py-3 px-4 font-medium text-[#00B900] hover:bg-[#00B900]/5 transition-colors text-sm"
            >
              เข้าสู่ระบบด้วย LINE
            </button>
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">
            ยังไม่มีบัญชี?{" "}
            <a
              href="/admin/register"
              className="text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
            >
              สมัครสมาชิก
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
