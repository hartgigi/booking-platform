import type { TenantPlan } from "@/types";

export const PACKAGES = [
  {
    id: "just_start" as const,
    name: "Just Start",
    duration: "1 เดือน",
    durationDays: 30,
    price: 499,
  },
  {
    id: "step_up" as const,
    name: "Step Up",
    duration: "3 เดือน",
    durationDays: 90,
    price: 1390,
  },
  {
    id: "keep_going" as const,
    name: "Keep Going",
    duration: "6 เดือน",
    durationDays: 180,
    price: 2990,
  },
  {
    id: "together" as const,
    name: "Together",
    duration: "12 เดือน",
    durationDays: 365,
    price: 4990,
  },
] as const;

export type PackageId = (typeof PACKAGES)[number]["id"];

export const PACKAGE_ID_TO_PLAN: Record<PackageId, TenantPlan> = {
  just_start: "basic",
  step_up: "basic",
  keep_going: "pro",
  together: "enterprise",
};

export function getPackageById(id: string) {
  return PACKAGES.find((p) => p.id === id) ?? null;
}
