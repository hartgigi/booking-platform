"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookingsPageClient } from "./BookingsPageClient";

const FIREBASE_TOKEN_KEY = "firebaseToken";

export function BookingsGuard() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        }
      })
      .catch(() => {
        setTenantId("");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-(--brand-primary) border-t-transparent animate-spin" />
      </div>
    );
  }

  if (tenantId === null) return null;

  return <BookingsPageClient tenantId={tenantId} />;
}

