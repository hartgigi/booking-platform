"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

const FIREBASE_TOKEN_KEY = "firebaseToken";

export interface TenantSettings {
  id: string;
  name: string;
  phone: string;
  address: string;
  openTime: string;
  closeTime: string;
  openDays: number[];
  slotDurationMinutes: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  promptPayNumber: string;
  depositMode: "auto" | "manual";
}

export function SettingsGuard() {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
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
        if (!data || data.tenantId == null) {
          router.replace("/admin/login");
          return;
        }
        return fetch("/api/admin/tenant", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
      })
      .then((res) => {
        if (!res || !res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data) {
          setTenant({
            id: data.id,
            name: data.name ?? "",
            phone: data.phone ?? "",
            address: data.address ?? "",
            openTime: data.openTime ?? "09:00",
            closeTime: data.closeTime ?? "18:00",
            openDays: Array.isArray(data.openDays) ? data.openDays : [1, 2, 3, 4, 5, 6],
            slotDurationMinutes: typeof data.slotDurationMinutes === "number" ? data.slotDurationMinutes : 60,
            bankName: data.bankName ?? "",
            bankAccountNumber: data.bankAccountNumber ?? "",
            bankAccountName: data.bankAccountName ?? "",
            promptPayNumber: data.promptPayNumber ?? "",
            depositMode: data.depositMode === "manual" || data.depositMode === "auto" ? data.depositMode : "manual",
          });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-(--brand-primary) border-t-transparent animate-spin" />
      </div>
    );
  }

  if (tenant === null) {
    return null;
  }

  return <SettingsClient tenant={tenant} />;
}
