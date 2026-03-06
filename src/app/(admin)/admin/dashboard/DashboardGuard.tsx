"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

const FIREBASE_TOKEN_KEY = "firebaseToken";

export function DashboardGuard() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          setTenantId(data.tenantId);
        } else {
          setTenantId("");
          router.replace("/admin/login");
        }
      })
      .catch((err) => {
        setTenantId("");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (tenantId === null) {
    return null;
  }

  return <DashboardClient tenantId={tenantId} />;
}
