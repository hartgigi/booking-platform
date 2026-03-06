import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { sendFlexMessage } from "@/lib/line/client";
import { buildReminderMessage } from "@/lib/line/messages";
import type { Booking } from "@/types";

const REMINDERS = "reminders";
const BOOKINGS = "bookings";

async function getTenantName(tenantId: string): Promise<string> {
  const doc = await adminDb.collection("tenants").doc(tenantId).get();
  if (!doc.exists) return "";
  return (doc.data()?.name as string) ?? "";
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
    status: data.status as Booking["status"],
    notes: (data.notes as string) ?? "",
    price: data.price as number | undefined,
    depositAmount: (data.depositAmount as number) ?? 0,
    depositStatus: (data.depositStatus as Booking["depositStatus"]) ?? "none",
    depositPaidAt: (data.depositPaidAt as Booking["depositPaidAt"]) ?? null,
    depositChargeId: (data.depositChargeId as string) ?? "",
    remainingAmount: (data.remainingAmount as number) ?? 0,
    remainingPaidAt: (data.remainingPaidAt as Booking["remainingPaidAt"]) ?? null,
    remainingStatus: (data.remainingStatus as Booking["remainingStatus"]) ?? "pending",
    createdAt: data.createdAt as Booking["createdAt"],
    updatedAt: data.updatedAt as Booking["updatedAt"],
  };
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = Timestamp.now();
  const snap = await adminDb
    .collection(REMINDERS)
    .where("status", "==", "pending")
    .where("scheduledAt", "<=", now)
    .get();

  for (const doc of snap.docs) {
    const { tenantId, bookingId } = doc.data();
    try {
      const bookingSnap = await adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection(BOOKINGS)
        .doc(bookingId)
        .get();
      if (!bookingSnap.exists) {
        await doc.ref.update({
          status: "cancelled",
          updatedAt: Timestamp.now(),
        });
        continue;
      }
      const booking = toBooking(bookingSnap.id, bookingSnap.data() ?? {});
      if (booking.status !== "confirmed") {
        await doc.ref.update({
          status: "cancelled",
          updatedAt: Timestamp.now(),
        });
        continue;
      }
      const tenantName = await getTenantName(tenantId);
      const flex = buildReminderMessage(booking, tenantName);
      await sendFlexMessage(
        tenantId,
        booking.customerLineId,
        "แจ้งเตือนนัดหมายพรุ่งนี้",
        flex
      );
      await doc.ref.update({
        status: "sent",
        sentAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch {
      // leave reminder pending for retry
    }
  }

  return NextResponse.json({ processed: snap.size });
}
