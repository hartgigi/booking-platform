"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PACKAGES } from "@/lib/packages";
import { cn } from "@/lib/utils/cn";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

const FIREBASE_TOKEN_KEY = "firebaseToken";

const FEATURES = [
  "จัดการบริการไม่จำกัด",
  "จัดการพนักงานไม่จำกัด",
  "รับการจองผ่าน Line OA",
  "แจ้งเตือนอัตโนมัติ",
  "Dashboard & รายงาน",
];

const FAQ_ITEMS = [
  {
    q: "สามารถเปลี่ยนแพ็คเกจในภายหลังได้หรือไม่?",
    a: "ได้ครับ คุณสามารถอัปเกรดหรือดาวน์เกรดเมื่อไหร่ก็ได้ การเปลี่ยนแปลงจะมีผลในรอบบิลถัดไป",
  },
  {
    q: "การชำระเงินปลอดภัยหรือไม่?",
    a: "เรารับชำระผ่านระบบที่ได้มาตรฐาน ข้อมูลการชำระเงินถูกเข้ารหัสและไม่เก็บข้อมูลบัตรเครดิตบนเซิร์ฟเวอร์ของเรา",
  },
  {
    q: "ยกเลิกการสมัครได้อย่างไร?",
    a: "คุณสามารถยกเลิกได้จากหน้าตั้งค่า แพ็คเกจจะยังใช้งานได้จนถึงวันหมดอายุ จากนั้นจะไม่มีการหักเงินต่อ",
  },
];

export function PackageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancel = searchParams.get("cancel") === "true";
  const [auth, setAuth] = useState<{
    tenantId: string;
    plan: string;
    licenseExpiry: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FIREBASE_TOKEN_KEY)
        : null;
    if (!token) {
      setLoading(false);
      router.replace("/admin/login");
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 401) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(FIREBASE_TOKEN_KEY);
          }
          router.replace("/admin/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.tenantId != null) {
          setAuth({
            tenantId: data.tenantId,
            plan: data.plan ?? "trial",
            licenseExpiry: data.licenseExpiry ?? null,
          });
        } else {
          router.replace("/admin/login");
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          router.replace("/admin/login");
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [router]);

  const plan = auth?.plan ?? "trial";
  const licenseExpiry = auth?.licenseExpiry ?? null;
  const isExpired = licenseExpiry
    ? new Date(licenseExpiry).getTime() < Date.now()
    : true;
  const isTrial = plan === "trial";

  async function handleSelect(packageId: string) {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FIREBASE_TOKEN_KEY)
        : null;
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setError(null);
    setLoadingId(packageId);
    try {
      const res = await fetch("/api/admin/payment/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 503
            ? "ระบบชำระเงินยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
            : data.error ?? "เกิดข้อผิดพลาด"
        );
        return;
      }
      if (data.url) window.location.href = data.url;
      else setError("ไม่พบลิงก์ชำระเงิน");
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setLoadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!auth) return null;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="rounded-2xl bg-linear-to-br from-teal-600 to-teal-700 p-6 md:p-8 mb-6 text-white shadow-xl shadow-teal-900/20">
        <p className="text-sm text-white/80 uppercase tracking-wider mb-1">
          แพ็คเกจปัจจุบัน
        </p>
        <p className="font-semibold text-xl capitalize">{plan}</p>
        <p className="text-white/90 text-sm mt-1">
          วันหมดอายุ:{" "}
          {licenseExpiry
            ? new Date(licenseExpiry).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
        </p>
      </div>

      {(isExpired || isTrial) && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-4 mb-6"
        >
          {isExpired
            ? "แพ็คเกจหมดอายุแล้ว กรุณาต่ออายุเพื่อใช้งานต่อ"
            : "คุณกำลังใช้แพ็คเกจ Trial ต่ออายุเพื่อปลดล็อกฟีเจอร์เต็ม"}
        </div>
      )}

      {cancel && (
        <div
          role="status"
          className="rounded-xl border border-slate-200 bg-slate-50 text-slate-600 p-4 mb-6"
        >
          ยกเลิกการชำระเงินแล้ว
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 mb-6"
        >
          {error}
        </div>
      )}

      <div className="rounded-xl bg-linear-to-r from-teal-600/10 to-cyan-500/10 border border-teal-200 px-4 py-3 mb-8 text-center">
        <p className="text-sm font-medium text-teal-800">
          ประหยัดสูงสุด 30% เมื่อเลือกแพ็คเกจรายปี
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {PACKAGES.map((pkg, i) => {
          const isRecommended = pkg.id === "together";
          const badge =
            pkg.id === "step_up"
              ? "ประหยัด 7%"
              : pkg.id === "keep_going"
                ? "ประหยัด 17%"
                : pkg.id === "together"
                  ? "แนะนำ ประหยัด 30%"
                  : null;
          return (
            <div
              key={pkg.id}
              className={cn(
                "rounded-2xl border bg-white p-6 flex flex-col shadow-sm hover:shadow-lg transition-all relative animate-fade-in",
                isRecommended
                  ? "border-teal-500 ring-2 ring-teal-500/20"
                  : "border-slate-200"
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {pkg.id === "together" && (
                <div className="absolute -top-px right-6 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-b-lg shadow">
                  ยอดนิยม
                </div>
              )}
              {badge && pkg.id !== "together" && (
                <span
                  className={cn(
                    "inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-4 w-fit",
                    "bg-emerald-100 text-emerald-700"
                  )}
                >
                  {badge}
                </span>
              )}
              {pkg.id === "together" && (
                <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-4 w-fit bg-teal-100 text-teal-700">
                  {badge}
                </span>
              )}
              <h2 className="text-xl font-semibold text-slate-900">{pkg.name}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{pkg.duration}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                ฿{pkg.price.toLocaleString()}
              </p>
              <ul className="mt-6 space-y-3 flex-1">
                {FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <Check className="w-4 h-4 text-teal-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleSelect(pkg.id)}
                disabled={loadingId !== null}
                className={cn(
                  "mt-6 w-full rounded-xl py-3 px-4 font-medium transition-colors disabled:opacity-50",
                  "bg-teal-600 text-white hover:bg-teal-700"
                )}
              >
                {loadingId === pkg.id ? "กำลังนำทาง..." : "เลือกแพ็คเกจ"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-12">
        <h3 className="text-sm font-semibold text-slate-900 px-4 py-3 border-b border-slate-200 bg-slate-50">
          เปรียบเทียบแพ็คเกจ
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-2 text-slate-500 font-medium min-w-[140px] text-xs whitespace-normal break-words">
                  แพ็คเกจ
                </th>
                {PACKAGES.map((p) => (
                  <th key={p.id} className="text-center p-3 font-medium text-slate-900 min-w-[100px]">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="p-2 text-slate-600 min-w-[140px] text-xs whitespace-normal break-words">
                  ระยะเวลา
                </td>
                {PACKAGES.map((p) => (
                  <td key={p.id} className="p-3 text-center text-slate-700">{p.duration}</td>
                ))}
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-2 text-slate-600 min-w-[140px] text-xs whitespace-normal break-words">
                  ราคา
                </td>
                {PACKAGES.map((p) => (
                  <td key={p.id} className="p-3 text-center font-medium text-slate-900">
                    ฿{p.price.toLocaleString()}
                  </td>
                ))}
              </tr>
              {FEATURES.map((f) => (
                <tr key={f} className="border-b border-slate-100">
                  <td
                    className="p-2 text-slate-600 min-w-[140px] text-xs whitespace-normal break-words"
                    title={f}
                  >
                    {f}
                  </td>
                  {PACKAGES.map((p) => (
                    <td key={p.id} className="p-3 text-center">
                      <Check className="w-4 h-4 text-teal-600 inline-block" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <h3 className="text-sm font-semibold text-slate-900 px-4 py-3 border-b border-slate-200 bg-slate-50">
          คำถามที่พบบ่อย
        </h3>
        <div className="divide-y divide-slate-100">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors"
              >
                {item.q}
                {openFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <p className="px-4 pb-3 text-sm text-slate-600">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
