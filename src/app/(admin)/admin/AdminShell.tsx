"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const FIREBASE_TOKEN_KEY = "firebaseToken";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [tenantName, setTenantName] = useState("");
  const [plan, setPlan] = useState("trial");

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FIREBASE_TOKEN_KEY)
        : null;
    if (!token) return;
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tenantName) setTenantName(data.tenantName);
        if (data?.plan) setPlan(data.plan);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 admin-theme">
      <AdminSidebar tenantName={tenantName} plan={plan} />
      <main className="lg:pl-[260px] pt-14 min-h-screen">
        {children}
      </main>
    </div>
  );
}
