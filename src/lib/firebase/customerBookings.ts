import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  type Unsubscribe,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Booking, BookingStatus } from "@/types";
import type { Timestamp } from "firebase/firestore";

const COLLECTION = "bookings";

function toBooking(id: string, data: Record<string, unknown>): Booking {
  return {
    id,
    tenantId: data.tenantId as string,
    customerId: data.customerId as string,
    customerName: data.customerName as string,
    customerLineId: data.customerLineId as string,
    customerPhone: (data.customerPhone as string) ?? "",
    serviceId: data.serviceId as string,
    serviceName: data.serviceName as string,
    staffId: data.staffId as string,
    staffName: data.staffName as string,
    date: data.date as string,
    startTime: data.startTime as string,
    endTime: (data.endTime as string) ?? (data.startTime as string),
    status: data.status as BookingStatus,
    notes: (data.notes as string) ?? "",
    price: data.price as number | undefined,
    depositAmount: (data.depositAmount as number) ?? 0,
    depositStatus: (data.depositStatus as Booking["depositStatus"]) ?? "none",
    depositPaidAt: (data.depositPaidAt as Timestamp) ?? null,
    depositChargeId: (data.depositChargeId as string) ?? "",
    remainingAmount: (data.remainingAmount as number) ?? 0,
    remainingStatus: (data.remainingStatus as Booking["remainingStatus"]) ?? "pending",
    remainingPaidAt: (data.remainingPaidAt as Timestamp) ?? null,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getCustomerBookings(
  tenantId: string,
  lineUserId: string
): Promise<Booking[]> {
  const q = query(
    collection(db, "tenants", tenantId, COLLECTION),
    where("customerLineId", "==", lineUserId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toBooking(d.id, d.data()));
}

export async function getUpcomingBookings(
  tenantId: string,
  lineUserId: string
): Promise<Booking[]> {
  const today = getTodayStr();
  const q = query(
    collection(db, "tenants", tenantId, COLLECTION),
    where("customerLineId", "==", lineUserId),
    where("status", "in", ["open", "confirmed"]),
    where("date", ">=", today),
    orderBy("date", "asc"),
    orderBy("startTime", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toBooking(d.id, d.data()));
}

export async function getPastBookings(
  tenantId: string,
  lineUserId: string
): Promise<Booking[]> {
  const today = getTodayStr();
  const q = query(
    collection(db, "tenants", tenantId, COLLECTION),
    where("customerLineId", "==", lineUserId),
    orderBy("date", "desc"),
    limit(50)
  );
  const snapshot = await getDocs(q);
  const allowed: BookingStatus[] = ["user_cancelled", "admin_cancelled", "confirmed"];
  return snapshot.docs
    .map((d) => toBooking(d.id, d.data()))
    .filter((b) => b.date < today && allowed.includes(b.status))
    .slice(0, 20);
}

export function subscribeUpcomingBookings(
  tenantId: string,
  lineUserId: string,
  onUpdate: (bookings: Booking[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const today = getTodayStr();
  const q = query(
    collection(db, "tenants", tenantId, COLLECTION),
    where("customerLineId", "==", lineUserId),
    where("status", "in", ["open", "confirmed"]),
    where("date", ">=", today),
    orderBy("date", "asc"),
    orderBy("startTime", "asc")
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => toBooking(d.id, d.data()));
      onUpdate(list);
    },
    (err) => onError?.(err as Error)
  );
}

export function subscribePastBookings(
  tenantId: string,
  lineUserId: string,
  onUpdate: (bookings: Booking[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "tenants", tenantId, COLLECTION),
    where("customerLineId", "==", lineUserId),
    orderBy("date", "desc"),
    limit(50)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const today = getTodayStr();
      const allowed: BookingStatus[] = ["user_cancelled", "admin_cancelled", "confirmed"];
      const list = snapshot.docs
        .map((d) => toBooking(d.id, d.data()))
        .filter((b) => b.date < today && allowed.includes(b.status))
        .slice(0, 20);
      onUpdate(list);
    },
    (err) => onError?.(err as Error)
  );
}
