import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import type { Booking } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; bookingId: string }> }
) {
  try {
    const { tenantId, bookingId } = await params;
    const lineUserId = request.nextUrl.searchParams.get("lineUserId");
    if (!lineUserId) {
      return NextResponse.json({ error: "ต้องระบุ lineUserId" }, { status: 400 });
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
    const booking: Booking = {
      id: doc.id,
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
    return NextResponse.json({ booking });
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
