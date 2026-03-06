import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendFlexMessage } from "@/lib/line/client";
import {
  buildBookingSuccessMessage,
  buildBookingCancelledMessage,
} from "@/lib/line/messages";
import type { Booking } from "@/types";

const SESSION_COOKIE_NAME = "session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = await adminAuth.verifySessionCookie(sessionCookie);
    const tenantId = (decoded as { tenantId?: string }).tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { bookingId } = await params;
    const bookingSnap = await adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(bookingId)
      .get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const data = bookingSnap.data();
    if (data?.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const booking = { id: bookingSnap.id, ...data } as Booking;
    const body = await request.json().catch(() => ({}));
    const status = body.status as string | undefined;
    if (status === "confirmed") {
      const flex = buildBookingSuccessMessage(booking);
      await sendFlexMessage(
        tenantId,
        booking.customerLineId,
        "ยืนยันการจอง",
        flex
      );
    } else if (status === "admin_cancelled") {
      const flex = buildBookingCancelledMessage(booking);
      await sendFlexMessage(
        tenantId,
        booking.customerLineId,
        "ยกเลิกการจอง",
        flex
      );
    } else {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
