import type { Timestamp } from "firebase/firestore";

export type BusinessType =
  | "salon"
  | "spa"
  | "clinic"
  | "barbershop"
  | "other";

export type BookingStatus =
  | "open"
  | "confirmed"
  | "user_cancelled"
  | "admin_cancelled"
  | "completed";

export type TenantPlan = "trial" | "basic" | "pro" | "enterprise";

export interface Tenant {
  id: string;
  name: string;
  businessType: BusinessType;
  adminEmail?: string;
  lineOaId: string;
  lineChannelAccessToken: string;
  lineChannelSecret: string;
  adminLineUserId: string;
  logoUrl: string;
  coverImageUrl: string;
  address: string;
  phone: string;
  openDays: number[];
  openTime: string;
  closeTime: string;
  slotDurationMinutes: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  promptPayNumber: string;
  depositMode: "auto" | "manual";
  isActive: boolean;
  plan: TenantPlan;
  licenseExpiry: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  depositAmount: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  imageUrl: string;
  serviceIds: string[];
  workDays: number[];
  workStartTime: string;
  workEndTime: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Booking {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerLineId: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes: string;
  price?: number;
  depositAmount: number;
  depositStatus: "none" | "pending" | "paid" | "verified";
  depositPaidAt: Timestamp | null;
  depositChargeId: string;
  remainingAmount: number;
  remainingPaidAt: Timestamp | null;
  remainingStatus: "pending" | "paid";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DepositTransaction {
  id: string;
  tenantId: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  tenantName?: string;
  serviceName?: string;
  amount: number;
  totalCharged?: number;
  chargePercent: number;
  chargeAmount: number;
  omiseFee: number;
  shopReceiveAmount: number;
  superAdminReceiveAmount: number;
  mode: "auto" | "manual";
  status: "pending" | "completed" | "failed";
  createdAt: Timestamp;
}

export interface ShopPayout {
  id: string;
  tenantId: string;
  tenantName: string;
  totalAmount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: "pending" | "paid";
  paidAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface BookingFilters {
  date?: string;
  status?: BookingStatus;
  staffId?: string;
  serviceId?: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string;
  phone: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type BookingFlowState =
  | "idle"
  | "selecting_date"
  | "selecting_time"
  | "selecting_service"
  | "selecting_staff"
  | "confirming"
  | "completed";

export interface UserDoc {
  isSuperAdmin?: boolean;
  email?: string;
  createdAt?: Timestamp;
}

export interface BookingFlowStateDoc {
  tenantId: string;
  customerId: string;
  state: BookingFlowState;
  selectedDate: string | null;
  selectedTime: string | null;
  selectedServiceId: string | null;
  selectedStaffId: string | null;
  updatedAt: Timestamp;
}
