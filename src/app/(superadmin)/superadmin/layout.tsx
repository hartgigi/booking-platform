"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Store,
  Package,
  Receipt,
  ArrowUpRight,
  Settings,
} from "lucide-react";

const SUPER_ADMIN_TOKEN_KEY = "superAdminToken";

const navItems = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/tenants", label: "ร้านค้าทั้งหมด", icon: Store },
  { href: "/superadmin/packages", label: "แพ็คเกจ", icon: Package },
  { href: "/superadmin/deposits", label: "รายการมัดจำ", icon: Receipt },
  { href: "/superadmin/payouts", label: "โอนเงินร้านค้า", icon: ArrowUpRight },
  { href: "/superadmin/settings", label: "ตั้งค่าระบบ", icon: Settings },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/superadmin/login") {
      setVerified(true);
      setLoading(false);
      return;
    }

    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SUPER_ADMIN_TOKEN_KEY)
        : null;
    if (!token) {
      router.push("/superadmin/login");
      return;
    }

    fetch("/api/superadmin/verify", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((res) => {
        if (res.ok) {
          setVerified(true);
        } else {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
          }
          router.push("/superadmin/login");
        }
      })
      .catch(() => {
        router.push("/superadmin/login");
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
    }
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (pathname === "/superadmin/login") {
    return <>{children}</>;
  }

  if (!verified) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed top-4 left-4 z-50 rounded-lg border border-zinc-700 bg-zinc-800/80 p-2 text-zinc-300 md:hidden"
        aria-label="เมนู"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-zinc-800 bg-zinc-900/95 transition-transform duration-300 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="p-4 border-b border-zinc-800">
            <span className="inline-block rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium px-2.5 py-1">
              Super Admin
            </span>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg border border-zinc-700 px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          aria-label="ปิด"
        />
      )}
      <main className="md:pl-64 min-h-screen">{children}</main>
    </div>
  );
}
