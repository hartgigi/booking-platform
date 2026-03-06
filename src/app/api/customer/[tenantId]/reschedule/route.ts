import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { cancelBooking, createBooking } from "@/lib/firebase/createBooking";
import { notifyAdminNewBooking } from "@/lib/line/notify";
import type { Booking } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const { bookingId, newDate, newTime, lineUserId } = body as {
      bookingId: string;
      newDate: string;
      newTime: string;
      lineUserId: string;
    };
    if (!bookingId || !newDate || !newTime || !lineUserId) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน" },
        { status: 400 }
      );
    }
    const doc = await adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(bookingId)
      .get();
    if (!doc.exists) {
      return NextResponse.json({ error: "ไม่พบการจอง" }, { status: 404 });
    }
    const data = doc.data();
    if (data?.tenantId !== tenantId || (data?.customerLineId as string) !== lineUserId) {
      return NextResponse.json({ error: "ไม่พบการจอง" }, { status: 404 });
    }
    const booking = { id: doc.id, ...data } as Booking;
    if (booking.status !== "open" && booking.status !== "confirmed") {
      return NextResponse.json(
        { error: "ไม่สามารถเลื่อนการจองนี้ได้" },
        { status: 400 }
      );
    }
    await cancelBooking(tenantId, bookingId, lineUserId);
    const newBooking = await createBooking(tenantId, {
      customerId: booking.customerId,
      customerName: booking.customerName,
      customerLineId: booking.customerLineId,
      customerPhone: booking.customerPhone,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      staffId: booking.staffId,
      staffName: booking.staffName,
      date: newDate,
      startTime: newTime,
      notes: booking.notes ?? "",
      price: booking.price,
    });
    await notifyAdminNewBooking(tenantId, newBooking as Booking).catch(() => {});
    return NextResponse.json({ booking: newBooking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
