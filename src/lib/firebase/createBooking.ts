import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { scheduleReminder, cancelReminder } from "@/lib/booking/reminderScheduler";
import { notifyCustomerBookingReceived } from "@/lib/line/notify";
import type { Booking } from "@/types";

const BOOKINGS = "bookings";
const SERVICES = "services";
const STAFF = "staff";

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  return a0 < b1 && a1 > b0;
}

export interface CreateBookingData {
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
  notes: string;
  price?: number;
}

async function getServiceDoc(tenantId: string, serviceId: string) {
  const subSnap = await adminDb.collection("tenants").doc(tenantId).collection("services").doc(serviceId).get();
  if (subSnap.exists) return subSnap;
  return adminDb.collection(SERVICES).doc(serviceId).get();
}

async function getStaffWithService(tenantId: string, serviceId: string) {
  const subSnap = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("staff")
    .where("serviceIds", "array-contains", serviceId)
    .get();
  if (!subSnap.empty) return subSnap;
  return adminDb
    .collection(STAFF)
    .where("tenantId", "==", tenantId)
    .where("serviceIds", "array-contains", serviceId)
    .get();
}

export async function createBooking(
  tenantId: string,
  data: CreateBookingData
): Promise<Booking> {
  const serviceSnap = await getServiceDoc(tenantId, data.serviceId);
  if (!serviceSnap.exists) {
    throw new Error("ไม่พบบริการ");
  }
  const serviceData = serviceSnap.data();
  const durationMinutes = (serviceData?.durationMinutes as number) ?? 60;
  const price = (serviceData?.price as number) ?? data.price;
  const startMin = timeToMinutes(data.startTime);
  const endTime = minutesToTime(startMin + durationMinutes);

  let staffId = data.staffId;
  let staffName = data.staffName;

  if (staffId === "any") {
    const staffSnap = await getStaffWithService(tenantId, data.serviceId);
    const candidates = staffSnap.docs
      .filter((d) => (d.data().isActive as boolean) !== false)
      .map((d) => ({ id: d.id, name: (d.data().name as string) ?? "" } as { id: string; name: string }));

    let found = false;
    for (const s of candidates) {
      const existingSnap = await adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection(BOOKINGS)
        .where("staffId", "==", s.id)
        .where("date", "==", data.date)
        .where("status", "in", ["open", "confirmed"])
        .get();
      const hasOverlap = existingSnap.docs.some((d) => {
        const b = d.data();
        return overlaps(data.startTime, endTime, b.startTime as string, b.endTime as string);
      });
      if (!hasOverlap) {
        staffId = s.id;
        staffName = s.name;
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error("ไม่มีพนักงานว่างในเวลานี้");
    }
  }

  const existingSnap = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection(BOOKINGS)
    .where("staffId", "==", staffId)
    .where("date", "==", data.date)
    .where("status", "in", ["open", "confirmed"])
    .get();

  const hasDouble = existingSnap.docs.some((d) => {
    const b = d.data();
    return overlaps(data.startTime, endTime, b.startTime as string, b.endTime as string);
  });
  if (hasDouble) {
    throw new Error("เวลานี้ถูกจองแล้ว กรุณาเลือกเวลาใหม่");
  }

  const bookingRef = adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection(BOOKINGS)
    .doc();
  const now = FieldValue.serverTimestamp();
  const booking: Omit<Booking, "id"> & { id: string } = {
    id: bookingRef.id,
    tenantId,
    customerId: data.customerId,
    customerName: data.customerName,
    customerLineId: data.customerLineId,
    customerPhone: data.customerPhone,
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    staffId,
    staffName,
    date: data.date,
    startTime: data.startTime,
    endTime,
    status: "open",
    notes: data.notes ?? "",
    price,
    depositAmount: 0,
    depositStatus: "none",
    depositPaidAt: null,
    depositChargeId: "",
    remainingAmount: price ?? 0,
    remainingPaidAt: null,
    remainingStatus: "pending",
    createdAt: now as Booking["createdAt"],
    updatedAt: now as Booking["updatedAt"],
  };
  await bookingRef.set(booking);
  await scheduleReminder(tenantId, bookingRef.id).catch(() => {});
  await notifyCustomerBookingReceived(tenantId, { ...booking }).catch(() => {});
  return { ...booking };
}

export async function cancelBooking(
  tenantId: string,
  bookingId: string,
  lineUserId: string
): Promise<Booking> {
  const bookingRef = adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection(BOOKINGS)
    .doc(bookingId);
  const snap = await bookingRef.get();
  if (!snap.exists) {
    throw new Error("ไม่พบการจอง");
  }
  const data = snap.data();
  if (data?.tenantId !== tenantId) {
    throw new Error("การจองไม่ตรงกับร้าน");
  }
  if ((data?.customerLineId as string) !== lineUserId) {
    throw new Error("ไม่สามารถยกเลิกการจองของผู้อื่นได้");
  }
  await cancelReminder(tenantId, bookingId).catch(() => {});
  await bookingRef.update({
    status: "user_cancelled",
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updated = await bookingRef.get();
  return { id: updated.id, ...updated.data(), status: "user_cancelled" } as Booking;
}
