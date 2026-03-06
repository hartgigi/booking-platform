"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const FIREBASE_TOKEN_KEY = "firebaseToken";

export function PackageSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [licenseExpiry, setLicenseExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FIREBASE_TOKEN_KEY)
        : null;
    if (!token) return;
    const t = setTimeout(() => {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.licenseExpiry) setLicenseExpiry(data.licenseExpiry);
        })
        .finally(() => setLoading(false));
    }, 1500);
    return () => clearTimeout(t);
  }, [sessionId]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm p-8 md:p-12 max-w-md w-full text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 -top-2 animate-confetti-fall"
              style={{
                left: `${(i * 7) % 100}%`,
                animationDelay: `${(i * 0.05) % 0.5}s`,
                backgroundColor: [
                  "#10b981",
                  "#f59e0b",
                  "#3b82f6",
                  "#0d9488",
                  "#ef4444",
                ][i % 5],
              }}
            />
          ))}
        </div>
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-teal-600">✓</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            ขอบคุณที่ไว้วางใจ JongMe
          </h1>
          <p className="text-slate-600 mb-6">
            แพ็คเกจของคุณได้รับการอัพเกรดแล้ว
          </p>
          {loading ? (
            <p className="text-sm text-slate-500 mb-6">กำลังโหลดข้อมูล...</p>
          ) : licenseExpiry ? (
            <p className="text-sm text-slate-500 mb-6">
              วันหมดอายุ:{" "}
              {new Date(licenseExpiry).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          ) : null}
          <Link
            href="/admin/dashboard"
            className="inline-block rounded-xl bg-teal-600 text-white font-medium py-3 px-6 hover:bg-teal-700 transition-colors"
          >
            กลับไปหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}

