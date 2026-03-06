import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

export async function getAvailableSlots(
  tenantId: string,
  staffId: string,
  serviceId: string,
  date: string
): Promise<TimeSlot[]> {
  const [staffSnap, serviceSnap, tenantSnap, bookingsSnap] = await Promise.all([
    getDoc(doc(db, "staff", staffId)),
    getDoc(doc(db, "services", serviceId)),
    getDoc(doc(db, "tenants", tenantId)),
    getDocs(
      query(
        collection(db, "bookings"),
        where("tenantId", "==", tenantId),
        where("staffId", "==", staffId),
        where("date", "==", date),
        where("status", "in", ["confirmed", "open"])
      )
    ),
  ]);

  if (!staffSnap.exists() || !serviceSnap.exists() || !tenantSnap.exists()) {
    return [];
  }

  const staff = staffSnap.data();
  const service = serviceSnap.data();
  const tenant = tenantSnap.data();
  const workStartTime = (staff?.workStartTime as string) ?? "09:00";
  const workEndTime = (staff?.workEndTime as string) ?? "18:00";
  const durationMinutes = (service?.durationMinutes as number) ?? 60;
  const slotDurationMinutes = (tenant?.slotDurationMinutes as number) ?? 30;

  const startMin = timeToMinutes(workStartTime);
  const endMin = timeToMinutes(workEndTime);
  const slots: TimeSlot[] = [];
  const blockedRanges: { start: number; end: number }[] = [];

  const now = new Date();
  const bookingDocs = bookingsSnap.docs;
  for (const d of bookingDocs) {
    const b = d.data();
    const serviceRef = await getDoc(doc(db, "services", b.serviceId));
    const dur = serviceRef.exists()
      ? ((serviceRef.data()?.durationMinutes as number) ?? 60)
      : 60;
    const bStart = timeToMinutes(b.startTime as string);
    const bEndMin = bStart + dur;
    const endTimeStr = minutesToTime(bEndMin);
    const bookingEnd = new Date(`${date}T${endTimeStr}:00`);
    if (bookingEnd <= now) continue;
    blockedRanges.push({ start: bStart, end: bStart + dur });
  }

  for (let m = startMin; m + durationMinutes <= endMin; m += slotDurationMinutes) {
    const slotStart = m;
    const slotEnd = m + durationMinutes;
    const overlaps = blockedRanges.some(
      (r) => (slotStart >= r.start && slotStart < r.end) || (slotEnd > r.start && slotEnd <= r.end) || (slotStart <= r.start && slotEnd >= r.end)
    );
    slots.push({
      time: minutesToTime(slotStart),
      isAvailable: !overlaps,
    });
  }

  return slots;
}

export async function getAvailableDates(
  tenantId: string,
  staffId: string | null,
  month: string
): Promise<string[]> {
  let workDays: number[] = [];
  if (staffId) {
    const staffSnap = await getDoc(doc(db, "staff", staffId));
    if (!staffSnap.exists()) return [];
    const staff = staffSnap.data();
    workDays = (staff?.workDays as number[]) ?? [];
  } else {
    const tenantSnap = await getDoc(doc(db, "tenants", tenantId));
    if (!tenantSnap.exists()) return [];
    const tenant = tenantSnap.data();
    workDays = (tenant?.openDays as number[]) ?? [];
  }
  if (workDays.length === 0) return [];

  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  const d = new Date(firstDay);
  while (d <= lastDay) {
    const dayOfWeek = d.getDay();
    if (workDays.includes(dayOfWeek)) {
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (d >= today) dates.push(dateStr);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}
