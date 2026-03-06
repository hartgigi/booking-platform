import type { Timestamp } from "firebase/firestore";
import type { Tenant } from "@/types";

export interface SuperAdmin {
  id: string;
  email: string;
  createdAt: Timestamp;
}

export interface TenantWithStats extends Tenant {
  totalBookings: number;
  totalRevenue: number;
  isActive: boolean;
  licenseExpiry: Timestamp | null;
  plan: "trial" | "basic" | "pro" | "enterprise";
}

export interface Package {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
}
