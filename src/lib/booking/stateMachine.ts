import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  notifyCustomerBookingConfirmed,
  notifyCustomerBookingCancelledByAdmin,
  notifyAdminBookingCancelledByUser,
} from "@/lib/line/notify";
import { cancelReminder } from "@/lib/booking/reminderScheduler";
import type { Booking, BookingStatus } from "@/types";

const TRANSITIONS: Record<BookingStatus, Record<"admin" | "customer", BookingStatus[]>> = {
  open: {
    admin: ["confirmed", "admin_cancelled"],
    customer: ["user_cancelled"],
  },
  confirmed: {
    admin: ["admin_cancelled", "completed"],
    customer: ["user_cancelled"],
  },
  user_cancelled: { admin: [], customer: [] },
  admin_cancelled: { admin: [], customer: [] },
  completed: { admin: [], customer: [] },
};

export function isValidTransition(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
  actor: "admin" | "customer"
): boolean {
  const allowed = TRANSITIONS[currentStatus]?.[actor] ?? [];
  return allowed.includes(nextStatus);
}

export function getAvailableTransitions(
  currentStatus: BookingStatus,
  actor: "admin" | "customer"
): BookingStatus[] {
  return TRANSITIONS[currentStatus]?.[actor] ?? [];
}

export async function transitionBooking(
  tenantId: string,
  bookingId: string,
  nextStatus: BookingStatus,
  actor: "admin" | "customer"
): Promise<Booking> {
  const ref = adminDb.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("ไม่พบการจอง");
  }
  const data = snap.data();
  if (data?.tenantId !== tenantId) {
    throw new Error("การจองไม่ตรงกับร้าน");
  }
  const currentStatus = data?.status as BookingStatus;
  if (!isValidTransition(currentStatus, nextStatus, actor)) {
    throw new Error("การเปลี่ยนสถานะนี้ไม่ได้รับอนุญาต");
  }
  await ref.update({
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  const booking = { id: updated.id, ...updated.data(), status: nextStatus } as Booking;

  if (nextStatus === "user_cancelled" || nextStatus === "admin_cancelled") {
    await cancelReminder(tenantId, bookingId).catch(() => {});
  }

  if (currentStatus === "open" && nextStatus === "confirmed") {
    await notifyCustomerBookingConfirmed(tenantId, booking).catch(() => {});
  }
  if (nextStatus === "user_cancelled") {
    await notifyAdminBookingCancelledByUser(tenantId, booking).catch(() => {});
  }
  if (nextStatus === "admin_cancelled") {
    await notifyCustomerBookingCancelledByAdmin(tenantId, booking).catch(() => {});
  }

  return booking;
}
