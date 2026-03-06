import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { format } from "date-fns";
import { db } from "@/lib/firebase/client";
import type { Booking, BookingStatus } from "@/types";
import type { BookingFilters } from "@/types";

const COLLECTION = "bookings";

function bookingsCollection(tenantId: string) {
  return collection(db, "tenants", tenantId, "bookings");
}

function toBooking(id: string, data: DocumentData): Booking {
  return {
    id,
    tenantId: data.tenantId,
    customerId: data.customerId,
    customerName: data.customerName,
    customerLineId: data.customerLineId,
    customerPhone: data.customerPhone ?? "",
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    staffId: data.staffId,
    staffName: data.staffName,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime ?? data.startTime,
    status: data.status as BookingStatus,
    notes: data.notes ?? "",
    price: data.price,
    depositAmount: data.depositAmount ?? 0,
    depositStatus: (data.depositStatus as Booking["depositStatus"]) ?? "none",
    depositPaidAt: (data.depositPaidAt as Timestamp) ?? null,
    depositChargeId: (data.depositChargeId as string) ?? "",
    remainingAmount: data.remainingAmount ?? 0,
    remainingStatus: (data.remainingStatus as Booking["remainingStatus"]) ?? "pending",
    remainingPaidAt: (data.remainingPaidAt as Timestamp) ?? null,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

export async function getBookings(
  tenantId: string,
  filters: BookingFilters = {}
): Promise<Booking[]> {
  console.log("Querying bookings from:", `tenants/${tenantId}/bookings`);
  const constraints: QueryConstraint[] = [];
  if (filters.date) constraints.push(where("date", "==", filters.date));
  if (filters.status) constraints.push(where("status", "==", filters.status));
  if (filters.staffId) constraints.push(where("staffId", "==", filters.staffId));
  if (filters.serviceId) constraints.push(where("serviceId", "==", filters.serviceId));
  constraints.push(orderBy("date", "desc"));
  constraints.push(orderBy("startTime", "asc"));
  const q = query(bookingsCollection(tenantId), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toBooking(d.id, { ...d.data(), tenantId }));
}

export async function getBooking(
  tenantId: string,
  bookingId: string
): Promise<Booking | null> {
  const ref = doc(db, "tenants", tenantId, "bookings", bookingId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return toBooking(snapshot.id, { ...data, tenantId });
}

export async function updateBookingStatus(
  tenantId: string,
  bookingId: string,
  status: "confirmed" | "admin_cancelled" | "completed"
): Promise<void> {
  const ref = doc(db, "tenants", tenantId, "bookings", bookingId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    throw new Error("Booking not found");
  }
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function getTodayBookings(tenantId: string): Promise<Booking[]> {
  const today = format(new Date(), "yyyy-MM-dd");
  const q = query(
    bookingsCollection(tenantId),
    where("date", "==", today),
    orderBy("startTime", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toBooking(d.id, { ...d.data(), tenantId }));
}

export interface BookingStats {
  totalToday: number;
  totalPending: number;
  totalConfirmed: number;
  totalCancelled: number;
  totalCompleted: number;
  totalThisMonth: number;
  revenueThisMonth: number;
  totalRemainingPending: number;
}

export async function getBookingStats(
  tenantId: string
): Promise<BookingStats> {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const monthStart = format(now, "yyyy-MM-01");
  const snapshot = await getDocs(
    query(
      bookingsCollection(tenantId),
      where("date", ">=", monthStart),
      where("date", "<=", today)
    )
  );
  const docs = snapshot.docs.map((d) => d.data());
  let totalToday = 0;
  let totalPending = 0;
  let totalConfirmed = 0;
  let totalCancelled = 0;
  let totalCompleted = 0;
  let revenueThisMonth = 0;
  let totalRemainingPending = 0;
  for (const d of docs) {
    const date = d.date as string;
    const status = (d.status as string) ?? "";
    if (date === today) totalToday += 1;
    if (status === "open") totalPending += 1;
    else if (status === "confirmed") {
      totalConfirmed += 1;
      revenueThisMonth += Number(d.price) || 0;
    } else if (status === "user_cancelled" || status === "admin_cancelled") {
      totalCancelled += 1;
    } else if (status === "completed") {
      totalCompleted += 1;
      revenueThisMonth += Number(d.price) || 0;
    }
    if ((d.remainingStatus as string) === "pending" && Number(d.remainingAmount) > 0) {
      totalRemainingPending += 1;
    }
  }
  return {
    totalToday,
    totalPending,
    totalConfirmed,
    totalCancelled,
    totalCompleted,
    totalThisMonth: docs.length,
    revenueThisMonth,
    totalRemainingPending,
  };
}
