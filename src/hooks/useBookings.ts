import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  type Unsubscribe,
  type QueryConstraint,
} from "firebase/firestore";
import { format } from "date-fns";
import { db } from "@/lib/firebase/client";
import type { Booking, BookingStatus } from "@/types";
import type { BookingFilters } from "@/types";
import type { Timestamp } from "firebase/firestore";

function bookingsCollection(tenantId: string) {
  return collection(db, "tenants", tenantId, "bookings");
}

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

export function useBookings(
  tenantId: string | null,
  filters: BookingFilters = {}
) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setBookings([]);
      setLoading(false);
      setError(null);
      return;
    }
    console.log("useBookings tenantId:", tenantId);
    setLoading(true);
    setError(null);
    // Firestore listener: must return unsubscribe for cleanup on unmount
    const constraints: QueryConstraint[] = [];
    if (filters.date) constraints.push(where("date", "==", filters.date));
    if (filters.status) constraints.push(where("status", "==", filters.status));
    if (filters.staffId) constraints.push(where("staffId", "==", filters.staffId));
    if (filters.serviceId) constraints.push(where("serviceId", "==", filters.serviceId));
    constraints.push(orderBy("date", "desc"));
    constraints.push(orderBy("startTime", "asc"));
    console.log("useBookings filters:", JSON.stringify(filters));
    console.log(
      "useBookings constraints:",
      constraints.map((c) => (c as any).toString && (c as any).toString())
    );
    console.log("Querying bookings from:", `tenants/${tenantId}/bookings`);
    const q = query(bookingsCollection(tenantId), ...constraints);
    const unsub: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(
          "useBookings snapshot size:",
          snapshot.size,
          "docs:",
          snapshot.docs.map((d) => d.id)
        );
        setBookings(
          snapshot.docs.map((d) =>
            toBooking(d.id, { ...d.data(), tenantId } as Record<string, unknown>)
          )
        );
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    // TEMP DEBUG: query without filters
    getDocs(collection(db, "tenants", tenantId, "bookings")).then((snap) => {
      console.log(
        "DEBUG: All bookings (no filter):",
        snap.size,
        snap.docs.map((d) => ({
          id: d.id,
          date: d.data().date,
          status: d.data().status,
        }))
      );
    });
    return () => unsub();
  }, [tenantId, filters.date, filters.status, filters.staffId, filters.serviceId]);

  return { bookings, loading, error };
}

export function useTodayBookings(tenantId: string | null) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setBookings([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const today = format(new Date(), "yyyy-MM-dd");
    const q = query(
      bookingsCollection(tenantId),
      where("date", "==", today),
      orderBy("startTime", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setBookings(snapshot.docs.map((d) => toBooking(d.id, { ...d.data(), tenantId } as Record<string, unknown>)));
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tenantId]);

  return { bookings, loading, error };
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

export function useBookingStats(tenantId: string | null) {
  const [stats, setStats] = useState<BookingStats>({
    totalToday: 0,
    totalPending: 0,
    totalConfirmed: 0,
    totalCancelled: 0,
    totalCompleted: 0,
    totalThisMonth: 0,
    revenueThisMonth: 0,
    totalRemainingPending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      setError(null);
      return;
    }
    console.log("useBookingStats tenantId:", tenantId);
    setLoading(true);
    setError(null);
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const monthStart = format(now, "yyyy-MM-01");
    const q = query(
      bookingsCollection(tenantId),
      where("date", ">=", monthStart),
      where("date", "<=", today)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        console.log("useBookingStats snapshot size:", snapshot.size);
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
        setStats({
          totalToday,
          totalPending,
          totalConfirmed,
          totalCancelled,
          totalCompleted,
          totalThisMonth: docs.length,
          revenueThisMonth,
          totalRemainingPending,
        });
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tenantId]);

  return { stats, loading, error };
}
