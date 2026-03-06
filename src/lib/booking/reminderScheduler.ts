import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const REMINDERS = "reminders";
const BOOKINGS = "bookings";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function scheduleReminder(
  tenantId: string,
  bookingId: string
): Promise<void> {
  const bookingSnap = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection(BOOKINGS)
    .doc(bookingId)
    .get();
  if (!bookingSnap.exists) return;
  const b = bookingSnap.data();
  const date = b?.date as string;
  const startTime = b?.startTime as string;
  if (!date || !startTime) return;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  const bookingAt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  const scheduledAt = new Date(bookingAt.getTime() - TWENTY_FOUR_HOURS_MS);
  const ref = adminDb.collection(REMINDERS).doc();
  await ref.set({
    tenantId,
    bookingId,
    scheduledAt: Timestamp.fromDate(scheduledAt),
    sentAt: null,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function cancelReminder(
  tenantId: string,
  bookingId: string
): Promise<void> {
  const snap = await adminDb
    .collection(REMINDERS)
    .where("tenantId", "==", tenantId)
    .where("bookingId", "==", bookingId)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (snap.empty) return;
  await snap.docs[0].ref.update({
    status: "cancelled",
    updatedAt: FieldValue.serverTimestamp(),
  });
}
