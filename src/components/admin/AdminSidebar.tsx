"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Scissors,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";

interface AdminSidebarProps {
  tenantName: string;
  plan?: string;
}

const mainNav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
];
const managementNav = [
  { href: "/admin/services", label: "บริการ", icon: Scissors },
  { href: "/admin/staff", label: "พนักงาน", icon: Users },
  { href: "/admin/package", label: "แพ็คเกจ", icon: CreditCard },
];
const accountNav = [
  { href: "/admin/settings", label: "ตั้งค่าร้าน", icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/services": "บริการ",
  "/admin/staff": "พนักงาน",
  "/admin/package": "แพ็คเกจ",
  "/admin/settings": "ตั้งค่าร้าน",
};

function getInitials(name: string) {
  if (!name.trim()) return "ร";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function AdminSidebar({ tenantName, plan = "trial" }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  function NavLink({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }) {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border-l-4",
          isActive
            ? "border-teal-400 bg-slate-700/50 text-white"
            : "border-transparent text-slate-300 hover:bg-slate-700/30 hover:text-white"
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed top-4 left-4 z-50 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm lg:hidden"
        aria-label="เมนู"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[260px] bg-linear-to-b from-slate-900 to-slate-800 transition-transform duration-300 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="p-5 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="h-9 px-3 rounded-full bg-linear-to-r from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/30">
                <span className="text-white font-bold text-sm">J</span>
              </div>
              <span className="font-semibold text-white">JongMe</span>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            <div>
              <p className="px-3 mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                เมนูหลัก
              </p>
              <div className="space-y-0.5">
                {mainNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </div>
            </div>
            <div>
              <p className="px-3 mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                การจัดการ
              </p>
              <div className="space-y-0.5">
                {managementNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </div>
            </div>
            <div>
              <p className="px-3 mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                บัญชี
              </p>
              <div className="space-y-0.5">
                {accountNav.map((item) => (
                  <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </div>
            </div>
          </nav>
          <div className="p-3 border-t border-slate-700/50 space-y-1">
            <div className="rounded-xl bg-slate-800/50 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0 text-white font-semibold text-sm">
                {getInitials(tenantName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{tenantName || "ร้านค้า"}</p>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-xs font-medium">
                  {PLAN_LABELS[plan] ?? plan}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-700/30 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          aria-label="ปิด"
        />
      )}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between px-4 lg:pl-[276px] pr-6">
          <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="การแจ้งเตือน"
            >
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-medium text-sm">
              {getInitials(tenantName)}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
