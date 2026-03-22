import type { WebhookEvent, WebhookRequestBody, FlexContainer } from "@line/bot-sdk";
import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { validateLineSignature } from "@/lib/line/client";
import {
  buildShopInfoMessage,
  buildLineDatePickerFlex,
  buildLineServicesFlex,
  buildLineStaffFlex,
  buildLineTimeSlotsFlex,
  buildLineBookingSummaryFlex,
  buildLineMyBookingsFlex,
  buildLineCancelConfirmFlex,
  buildBookingSuccessMessage,
  buildBookingCancelledMessage,
  buildLineRescheduleDatePickerFlex,
  buildLineRescheduleTimeSlotsFlex,
  buildBookingConfirmedMessage,
  buildRescheduleWebEntryFlex,
} from "@/lib/line/messages";
import {
  notifyAdminNewBooking,
  notifyAdminBookingCancelledByUser,
} from "@/lib/line/notify";
import { createBooking, cancelBooking } from "@/lib/firebase/createBooking";
import { scheduleReminder, cancelReminder } from "@/lib/booking/reminderScheduler";
import type { Tenant, Customer, Booking } from "@/types";
import { FieldValue } from "firebase-admin/firestore";
import { format, addDays, getDay } from "date-fns";

export async function GET() {
  return new Response("OK", { status: 200 });
}

export async function POST(
  request: Request,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params;
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
  let body: { events?: Array<{ webhookEventId?: string }> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = {};
  }
  const deliveryId =
    request.headers.get("x-line-delivery-id") ||
    body.events?.[0]?.webhookEventId ||
    Date.now().toString();
  const signature = request.headers.get("x-line-signature") ?? "";
  const tenant = await getTenantById(tenantId);
  if (!tenant) return NextResponse.json({ status: "ok" }, { status: 200 });
  if (!validateLineSignature(rawBody, tenant.lineChannelSecret, signature)) {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
  const dedupRef = adminDb.collection("webhook_dedup").doc(deliveryId);
  const dedupDoc = await dedupRef.get();
  if (dedupDoc.exists) {
    return NextResponse.json({ status: "duplicate" }, { status: 200 });
  }
  await dedupRef.set({ processedAt: new Date(), tenantId });
  await processEvents(tenantId, rawBody);
  return NextResponse.json({ status: "ok" }, { status: 200 });
}

async function getTenantServices(tenantId: string) {
  const subSnap = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("services")
    .where("isActive", "==", true)
    .get();
  if (!subSnap.empty) {
    return subSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: (data.name as string) ?? "",
        durationMinutes: (data.durationMinutes as number) ?? 0,
        price: (data.price as number) ?? 0,
      };
    });
  }
  const topSnap = await adminDb
    .collection("services")
    .where("tenantId", "==", tenantId)
    .where("isActive", "==", true)
    .get();
  return topSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: (data.name as string) ?? "",
      durationMinutes: (data.durationMinutes as number) ?? 0,
      price: (data.price as number) ?? 0,
    };
  });
}

async function getTenantStaff(tenantId: string) {
  const subSnap = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("staff")
    .where("isActive", "==", true)
    .get();
  if (!subSnap.empty) {
    return subSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: (data.name as string) ?? "",
        serviceIds: (data.serviceIds as string[]) ?? [],
      };
    });
  }
  const topSnap = await adminDb
    .collection("staff")
    .where("tenantId", "==", tenantId)
    .where("isActive", "==", true)
    .get();
  return topSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: (data.name as string) ?? "",
      serviceIds: (data.serviceIds as string[]) ?? [],
    };
  });
}

async function getOmiseQrPublicUrl(
  qrUrl: string,
  secretKey: string
): Promise<string> {
  if (!qrUrl || !secretKey) return "";
  try {
    const sharp = require("sharp");
    const response = await fetch(qrUrl, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(secretKey + ":").toString("base64"),
      },
    });
    if (!response.ok) {
      console.error("QR fetch error:", await response.text());
      return "";
    }
    const svgBuffer = Buffer.from(await response.arrayBuffer());
    const pngBuffer = await sharp(svgBuffer).png().resize(400, 400).toBuffer();
    const bucket = adminStorage.bucket(
      "booking-platform-80979.firebasestorage.app"
    );
    const fileName = `qr-codes/${Date.now()}.png`;
    const file = bucket.file(fileName);
    await file.save(pngBuffer, {
      contentType: "image/png",
      metadata: { cacheControl: "public, max-age=300" },
    });
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/booking-platform-80979.firebasestorage.app/${fileName}`;
    console.log("QR public URL:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("QR upload error:", err);
    return "";
  }
}

async function getServiceDoc(tenantId: string, serviceId: string) {
  const subSnap = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("services")
    .doc(serviceId)
    .get();
  if (subSnap.exists) return subSnap.data();
  const topSnap = await adminDb.collection("services").doc(serviceId).get();
  return topSnap.exists ? topSnap.data() : null;
}

async function getStaffDoc(tenantId: string, staffId: string) {
  if (staffId === "any") return null;
  const subSnap = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("staff")
    .doc(staffId)
    .get();
  if (subSnap.exists) return subSnap.data();
  const topSnap = await adminDb.collection("staff").doc(staffId).get();
  return topSnap.exists ? topSnap.data() : null;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const baseMinutes = (hours || 0) * 60 + (minutes || 0);
  const totalMinutes = baseMinutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(
    2,
    "0"
  )}`;
}

async function getAvailableSlotsForStaff(
  tenantId: string,
  staffId: string,
  serviceId: string,
  date: string
): Promise<{ time: string; isAvailable: boolean }[]> {
  const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
  const tenantData = tenantDoc.exists ? tenantDoc.data() : null;
  const slotDurationMinutes = (tenantData?.slotDurationMinutes as number) ?? 60;
  const openTime = (tenantData?.openTime as string) ?? "09:00";
  const closeTime = (tenantData?.closeTime as string) ?? "20:00";
  let workStartTime = openTime;
  let workEndTime = closeTime;
  let workDays: number[] = (tenantData?.openDays as number[]) ?? [1, 2, 3, 4, 5, 6];
  if (staffId !== "any") {
    const staffData = await getStaffDoc(tenantId, staffId);
    if (staffData) {
      workStartTime = (staffData.workStartTime as string) ?? openTime;
      workEndTime = (staffData.workEndTime as string) ?? closeTime;
      workDays = (staffData.workDays as number[]) ?? workDays;
    }
  }
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay();
  if (!workDays.includes(dayOfWeek)) return [];
  const serviceData = await getServiceDoc(tenantId, serviceId);
  const durationMinutes = (serviceData?.durationMinutes as number) ?? 60;
  const startMin = timeToMinutes(workStartTime);
  const endMin = timeToMinutes(workEndTime);
  let blockedRanges: { start: number; end: number }[] = [];
  if (staffId !== "any") {
    const bookingsSnap = await adminDb
      .collection("bookings")
      .where("tenantId", "==", tenantId)
      .where("staffId", "==", staffId)
      .where("date", "==", date)
      .where("status", "in", ["open", "confirmed"])
      .get();
    for (const d of bookingsSnap.docs) {
      const b = d.data();
      const servData = await getServiceDoc(tenantId, b.serviceId as string);
      const dur = (servData?.durationMinutes as number) ?? 60;
      const bStart = timeToMinutes(b.startTime as string);
      blockedRanges.push({ start: bStart, end: bStart + dur });
    }
  }
  const slots: { time: string; isAvailable: boolean }[] = [];
  for (let m = startMin; m + durationMinutes <= endMin; m += slotDurationMinutes) {
    const slotStart = m;
    const slotEnd = m + durationMinutes;
    const overlaps = blockedRanges.some(
      (r) =>
        (slotStart >= r.start && slotStart < r.end) ||
        (slotEnd > r.start && slotEnd <= r.end) ||
        (slotStart <= r.start && slotEnd >= r.end)
    );
    slots.push({
      time: minutesToTime(slotStart),
      isAvailable: !overlaps,
    });
  }
  return slots;
}

function getNext7OpenDates(openDays: number[]): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 14 && dates.length < 7; i++) {
    const d = addDays(new Date(), i);
    if (openDays.includes(getDay(d))) {
      dates.push(format(d, "yyyy-MM-dd"));
    }
  }
  return dates;
}

async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
  if (!tenantDoc.exists) return null;
  return { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
}

async function getChargePercent(): Promise<number> {
  const snap = await adminDb.collection("systemSettings").doc("chargeConfig").get();
  const data = snap.exists ? snap.data() : null;
  const value = (data?.chargePercent as number) ?? 4.65;
  return Number.isFinite(value) && value > 0 ? value : 4.65;
}

async function sendLineReply(replyToken: string, token: string, messages: object[]) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages }),
  });
  const result = await res.json();
  if (!res.ok) console.error("Line reply result:", JSON.stringify(result));
}

async function processEvents(tenantId: string, body: string) {
  try {
    const parsed = JSON.parse(body);
    console.log("[webhook] events:", JSON.stringify(parsed.events?.map((e: any) => ({ type: e.type, messageType: e.message?.type, text: e.message?.text, postbackData: e.postback?.data }))));
    const tenant = await getTenantById(tenantId);
    if (!tenant) return;

    for (const event of parsed.events ?? []) {
      console.log("[webhook] event type in loop:", event.type);
      if (event.type === "message" && event.message?.type === "text") {
        const text = event.message.text.toLowerCase().trim();
        const lineUserId = event.source?.userId;

        if (text === "admin" && !tenant.adminLineUserId) {
          await adminDb.collection("tenants").doc(tenantId).update({ adminLineUserId: lineUserId });
          await sendLineReply(event.replyToken, tenant.lineChannelAccessToken, [
            { type: "text", text: "✅ ระบบบันทึก Line ของคุณเป็น Admin แล้ว ตั้งแต่นี้คุณจะได้รับแจ้งเตือนการจองใหม่ทุกครั้ง" },
          ]);
          continue;
        }
      }

      await handleEvent(event, tenant);
    }
  } catch (err) {
    console.error("processEvents error:", err);
  }
}

async function getLineProfile(tenant: Tenant, userId: string): Promise<{ displayName?: string; pictureUrl?: string }> {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${tenant.lineChannelAccessToken}` },
  });
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

async function getOrCreateCustomer(
  tenantId: string,
  tenant: Tenant,
  lineUserId: string
): Promise<{ id: string; displayName: string; pictureUrl: string; phone: string }> {
  const existing = await adminDb
    .collection("customers")
    .where("tenantId", "==", tenantId)
    .where("lineUserId", "==", lineUserId)
    .limit(1)
    .get();
  if (!existing.empty) {
    const d = existing.docs[0];
    const data = d.data();
    return {
      id: d.id,
      displayName: (data.displayName as string) ?? "",
      pictureUrl: (data.pictureUrl as string) ?? "",
      phone: (data.phone as string) ?? "",
    };
  }
  const profile = await getLineProfile(tenant, lineUserId);
  const customerRef = adminDb.collection("customers").doc();
  const now = FieldValue.serverTimestamp();
  await customerRef.set({
    id: customerRef.id,
    tenantId,
    lineUserId,
    displayName: profile.displayName ?? "",
    pictureUrl: profile.pictureUrl ?? "",
    phone: "",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: customerRef.id,
    displayName: profile.displayName ?? "",
    pictureUrl: profile.pictureUrl ?? "",
    phone: "",
  };
}

async function handleEvent(event: WebhookEvent, tenant: Tenant) {
  const tenantId = tenant.id;
  const reply = (replyToken: string, messages: object[]) =>
    sendLineReply(replyToken, tenant.lineChannelAccessToken, messages);

  if (event.type === "follow") {
    const lineUserId = (event.source as { userId?: string }).userId;
    if (!lineUserId) return;
    await getOrCreateCustomer(tenantId, tenant, lineUserId);
    const [services, staff] = await Promise.all([getTenantServices(tenantId), getTenantStaff(tenantId)]);
    const flex = buildShopInfoMessage(
      { id: tenantId, name: tenant.name, businessType: tenant.businessType ?? "other" },
      services,
      staff,
      { followOnly: true, useLinePostback: true }
    );
    await reply((event as { replyToken: string }).replyToken, [
      { type: "flex", altText: `ยินดีต้อนรับสู่ ${tenant.name}`, contents: flex },
    ]);
    return;
  }

  if (event.type === "unfollow") {
    await handleUnfollow(tenantId, event);
    return;
  }

  if (event.type === "message") {
    console.log("[webhook] processing event type:", event.type);
    const userId = (event.source as { userId?: string }).userId;
    if (
      (event as { message?: { type?: string; text?: string } }).message?.type === "text" &&
      userId
    ) {
      const text = (event as { message: { text: string } }).message.text;
      console.log("[webhook] text message received:", (event as { message: { text: string } }).message.text);
      if (text.includes("เช็คการจอง") || text.includes("ตรวจสอบการจอง")) {
        console.log("[webhook] check booking handler triggered");
        let bookingsSnap: FirebaseFirestore.QuerySnapshot;
        try {
          bookingsSnap = await adminDb
            .collection("tenants")
            .doc(tenantId)
            .collection("bookings")
            .where("customerLineId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(5)
            .get();
          console.log("[webhook] query success, count:", bookingsSnap.size);
        } catch (queryErr: unknown) {
          console.log("[webhook] query error:", queryErr instanceof Error ? queryErr.message : String(queryErr));
          try {
            bookingsSnap = await adminDb
              .collection("tenants")
              .doc(tenantId)
              .collection("bookings")
              .where("customerLineId", "==", userId)
              .limit(5)
              .get();
            console.log("[webhook] fallback query success, count:", bookingsSnap.size);
          } catch (fallbackErr: unknown) {
            console.log("[webhook] fallback query error:", fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
            await reply((event as { replyToken: string }).replyToken, [
              { type: "text", text: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งค่ะ" },
            ]);
            return;
          }
        }
        if (bookingsSnap.empty) {
          await reply((event as { replyToken: string }).replyToken, [
            {
              type: "text",
              text: "ยังไม่มีประวัติการจองค่ะ 📋\nกดปุ่ม \"จองคิว\" ด้านล่างเพื่อจองได้เลยค่ะ",
            },
          ]);
          return;
        }
        const statusMap: Record<string, string> = {
          confirmed: "✅ ยืนยันแล้ว",
          open: "🟡 รอยืนยัน",
          completed: "✅ เสร็จสิ้น",
          cancelled: "❌ ยกเลิก",
          pending_deposit: "💰 รอชำระมัดจำ",
        };
        let replyText =
          "📋 ประวัติการจองของคุณ\n━━━━━━━━━━━━━━\n";
        bookingsSnap.docs.forEach((doc, i) => {
          const b = doc.data();
          const status = statusMap[b.status as string] || (b.status as string);
          replyText += `\n${i + 1}. ${(b.serviceName as string) || "ไม่ระบุ"}`;
          replyText += `\n   📅 ${b.date} ⏰ ${b.startTime} น.`;
          replyText += `\n   👤 ช่าง: ${(b.staffName as string) || "ไม่ระบุ"}`;
          replyText += `\n   📌 สถานะ: ${status}`;
          replyText += `\n   💰 ราคา: ฿${(b.remainingAmount as number) ?? 0}`;
          replyText += "\n━━━━━━━━━━━━━━";
        });
        await reply((event as { replyToken: string }).replyToken, [
          { type: "text", text: replyText },
        ]);
        return;
      }
    }
    if ((event as { message?: { type?: string } }).message?.type === "image") {
      const lineUserId = (event.source as { userId?: string }).userId;
      if (!lineUserId) return;
      const tenantId = tenant.id;
      const stateRef = adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection("customerStates")
        .doc(lineUserId);
      const stateSnap = await stateRef.get();
      if (stateSnap.exists && (stateSnap.data()?.state as string) === "waiting_slip") {
        const stateData = stateSnap.data() as {
          pendingDepositId: string;
          serviceId: string;
          date: string;
          depositAmount?: number;
        };
        const depositsRef = adminDb
          .collection("tenants")
          .doc(tenantId)
          .collection("pendingDeposits")
          .doc(stateData.pendingDepositId);
        await depositsRef.update({
          status: "waiting_verify",
          slipMessageId: (event as any).message.id,
          updatedAt: FieldValue.serverTimestamp(),
        });
        await stateRef.delete();
        await reply((event as { replyToken: string }).replyToken, [
          { type: "text", text: "ได้รับสลิปแล้วครับ ✅ กำลังตรวจสอบ กรุณารอสักครู่..." },
        ]);
        const profile = await getLineProfile(tenant, lineUserId);
        const service = await getServiceDoc(tenantId, stateData.serviceId);
        const depositAmount =
          typeof stateData.depositAmount === "number" && stateData.depositAmount > 0
            ? stateData.depositAmount
            : ((service?.depositAmount as number) ?? 0);
        if (tenant.adminLineUserId) {
          await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tenant.lineChannelAccessToken}`,
            },
            body: JSON.stringify({
              to: tenant.adminLineUserId,
              messages: [
                {
                  type: "flex",
                  altText: "สลิปค่ามัดจำ",
                  contents: {
                    type: "bubble",
                    header: {
                      type: "box",
                      layout: "vertical",
                      backgroundColor: "#F59E0B",
                      contents: [
                        {
                          type: "text",
                          text: "📋 สลิปค่ามัดจำ",
                          color: "#FFFFFF",
                          weight: "bold",
                          size: "lg",
                        },
                      ],
                    },
                    body: {
                      type: "box",
                      layout: "vertical",
                      spacing: "md",
                      contents: [
                        {
                          type: "text",
                          text: `ลูกค้า: ${profile.displayName ?? ""}`,
                          size: "sm",
                          color: "#333333",
                        },
                        {
                          type: "text",
                          text: `บริการ: ${(service?.name as string) ?? ""}`,
                          size: "sm",
                          color: "#333333",
                        },
                        {
                          type: "text",
                          text: `ค่ามัดจำ: ฿${depositAmount.toLocaleString()}`,
                          size: "sm",
                          color: "#333333",
                          weight: "bold",
                        },
                        {
                          type: "text",
                          text: "กรุณาตรวจสอบสลิปจากแชทลูกค้า",
                          size: "xs",
                          color: "#666666",
                          wrap: true,
                        },
                      ],
                    },
                    footer: {
                      type: "box",
                      layout: "horizontal",
                      spacing: "md",
                      contents: [
                        {
                          type: "button",
                          style: "primary",
                          color: "#10B981",
                          action: {
                            type: "postback",
                            label: "ยืนยัน ✅",
                            data: `action=verify_deposit&depositId=${stateData.pendingDepositId}&serviceId=${stateData.serviceId}&date=${stateData.date}&customerId=${lineUserId}`,
                          },
                        },
                        {
                          type: "button",
                          style: "secondary",
                          action: {
                            type: "postback",
                            label: "ปฏิเสธ ❌",
                            data: `action=reject_deposit&depositId=${stateData.pendingDepositId}&customerId=${lineUserId}`,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }),
          });
        }
        return;
      }
    }
    if ((event as { message?: { type?: string } }).message?.type === "text") {
      const [services, staff] = await Promise.all([getTenantServices(tenantId), getTenantStaff(tenantId)]);
      const flex = buildShopInfoMessage(
        { id: tenantId, name: tenant.name, businessType: tenant.businessType ?? "other" },
        services,
        staff,
        { useLinePostback: true }
      );
      await reply((event as { replyToken: string }).replyToken, [
        { type: "flex", altText: tenant.name, contents: flex },
      ]);
    }
    return;
  }

  if (event.type === "postback") {
    await handlePostback(tenantId, tenant, event, reply);
  }
}

async function handleUnfollow(
  tenantId: string,
  event: { source: { userId?: string } }
) {
  const lineUserId = event.source.userId;
  if (!lineUserId) return;
  const snapshot = await adminDb
    .collection("customers")
    .where("tenantId", "==", tenantId)
    .where("lineUserId", "==", lineUserId)
    .limit(1)
    .get();
  if (!snapshot.empty) {
    await snapshot.docs[0].ref.update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

function parsePostbackParams(data: string): Record<string, string> {
  const p = new URLSearchParams(data);
  const out: Record<string, string> = {};
  p.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

async function handlePostback(
  tenantId: string,
  tenant: Tenant,
  event: {
    replyToken: string;
    postback: { data: string };
    source: { userId?: string };
  },
  sendLineReply: (replyToken: string, messages: object[]) => Promise<unknown>
) {
  console.log("[webhook] handlePostback called, data:", event.postback.data);
  const data = event.postback.data;
  const lineUserId = event.source.userId;
  if (!lineUserId) {
    console.log("[webhook] handlePostback early return: no lineUserId");
    return;
  }
  const params = parsePostbackParams(data);
  const action = params.action;
  console.log("[webhook] parsed action:", action);

  if (action === "check_booking") {
    console.log("[webhook] check_booking block entered");
    let bookingsSnap: FirebaseFirestore.QuerySnapshot;
    try {
      bookingsSnap = await adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection("bookings")
        .where("customerLineId", "==", lineUserId)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();
      console.log("[webhook] query success, count:", bookingsSnap.size);
    } catch (queryErr: unknown) {
      console.log("[webhook] query error:", queryErr instanceof Error ? queryErr.message : String(queryErr));
      try {
        bookingsSnap = await adminDb
          .collection("tenants")
          .doc(tenantId)
          .collection("bookings")
          .where("customerLineId", "==", lineUserId)
          .limit(5)
          .get();
        console.log("[webhook] fallback query success, count:", bookingsSnap.size);
      } catch (fallbackErr: unknown) {
        console.log("[webhook] fallback query error:", fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
        await sendLineReply(event.replyToken, [
          { type: "text", text: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งค่ะ" },
        ]);
        return;
      }
    }
    if (bookingsSnap.empty) {
      await sendLineReply(event.replyToken, [
        {
          type: "text",
          text: "ยังไม่มีประวัติการจองค่ะ 📋\nกดปุ่ม \"จองคิว\" ด้านล่างเพื่อจองได้เลยค่ะ",
        },
      ]);
      return;
    }
    const statusMap: Record<string, string> = {
      confirmed: "✅ ยืนยันแล้ว",
      open: "🟡 รอยืนยัน",
      completed: "✅ เสร็จสิ้น",
      cancelled: "❌ ยกเลิก",
      pending_deposit: "💰 รอชำระมัดจำ",
    };
    let replyText = "📋 ประวัติการจองของคุณ\n━━━━━━━━━━━━━━\n";
    bookingsSnap.docs.forEach((doc, i) => {
      const b = doc.data();
      const status = statusMap[b.status as string] || (b.status as string);
      replyText += `\n${i + 1}. ${(b.serviceName as string) || "ไม่ระบุ"}`;
      replyText += `\n   📅 ${b.date} ⏰ ${b.startTime} น.`;
      replyText += `\n   👤 ช่าง: ${(b.staffName as string) || "ไม่ระบุ"}`;
      replyText += `\n   📌 สถานะ: ${status}`;
      replyText += `\n   💰 ราคา: ฿${(b.remainingAmount as number) ?? 0}`;
      replyText += "\n━━━━━━━━━━━━━━";
    });
    await sendLineReply(event.replyToken, [
      { type: "text", text: replyText },
    ]);
    return;
  }

  if (action === "reschedule") {
    const bookingId = params.bookingId;
    if (!bookingId) return;
    const bookingRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(bookingId);
    const snap = await bookingRef.get();
    if (!snap.exists) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่พบการจอง" }]);
      return;
    }
    const b = snap.data() as Booking;
    if (b.tenantId !== tenantId || b.customerLineId !== lineUserId) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่สามารถเลื่อนนัดนี้ได้" }]);
      return;
    }
    if (b.status !== "open" && b.status !== "confirmed") {
      await sendLineReply(event.replyToken, [
        { type: "text", text: "นัดนี้ไม่สามารถเลื่อนได้ (สถานะไม่ใช่กำลังจะมาถึง)" },
      ]);
      return;
    }
    const flex = buildRescheduleWebEntryFlex(tenantId, bookingId);
    await sendLineReply(event.replyToken, [
      { type: "flex", altText: "เลื่อนนัด — เปิดหน้าเว็บ", contents: flex },
    ]);
    return;
  }

  if (action === "start_booking") {
    const openDays = tenant.openDays ?? [1, 2, 3, 4, 5, 6];
    const dates = getNext7OpenDates(openDays);
    if (dates.length === 0) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่มีวันว่างใน 2 สัปดาห์ถัดไป" }]);
      return;
    }
    const flex = buildLineDatePickerFlex(dates);
    await sendLineReply(event.replyToken, [{ type: "flex", altText: "เลือกวันที่", contents: flex }]);
    return;
  }

  if (action === "select_date") {
    const date = params.date;
    if (!date) return;
    const services = await getTenantServices(tenantId);
    if (services.length === 0) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่มีบริการในขณะนี้" }]);
      return;
    }
    const flex = buildLineServicesFlex(date, services);
    await sendLineReply(event.replyToken, [{ type: "flex", altText: "เลือกบริการ", contents: flex }]);
    return;
  }

  if (action === "reschedule_select_date") {
    const bookingId = params.bookingId;
    const date = params.date;
    if (!bookingId || !date) return;
    const bookingRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(bookingId);
    const snap = await bookingRef.get();
    if (!snap.exists) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่พบการจอง" }]);
      return;
    }
    const b = snap.data() as Booking;
    if (b.tenantId !== tenantId || b.customerLineId !== lineUserId) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่สามารถเลื่อนนัดนี้ได้" }]);
      return;
    }
    const serviceId = b.serviceId;
    const staffId = b.staffId;
    const slots = await getAvailableSlotsForStaff(tenantId, staffId, serviceId, date);
    if (!slots.length || !slots.some((s) => s.isAvailable)) {
      await sendLineReply(event.replyToken, [
        { type: "text", text: "ไม่มีเวลาว่างในวันนี้ กรุณาเลือกวันอื่น" },
      ]);
      return;
    }
    const flex = buildLineRescheduleTimeSlotsFlex(bookingId, date, slots);
    await sendLineReply(event.replyToken, [
      { type: "flex", altText: "เลือกเวลาใหม่", contents: flex },
    ]);
    return;
  }

  if (action === "select_service") {
    const date = params.date;
    const serviceId = params.serviceId;
    if (!date || !serviceId) return;
    const staffList = await getTenantStaff(tenantId);
    const staffWithService = staffList.filter((s) =>
      s.serviceIds.includes(serviceId)
    );
    const staffForFlex = staffWithService.map((s) => ({
      id: s.id,
      name: s.name,
    }));
    const flex = buildLineStaffFlex(date, serviceId, staffForFlex);
    await sendLineReply(event.replyToken, [
      { type: "flex", altText: "เลือกพนักงาน", contents: flex },
    ]);
    return;
  }

  if (action === "select_staff") {
    const date = params.date;
    const serviceId = params.serviceId;
    const staffId = params.staffId;
    if (!date || !serviceId || !staffId) return;
    const slots = await getAvailableSlotsForStaff(tenantId, staffId, serviceId, date);
    if (slots.length === 0) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่มีเวลาว่างในวันนี้" }]);
      return;
    }
    const flex = buildLineTimeSlotsFlex(date, serviceId, staffId, slots);
    await sendLineReply(event.replyToken, [{ type: "flex", altText: "เลือกเวลา", contents: flex }]);
    return;
  }

  if (action === "select_time") {
    const date = params.date;
    const serviceId = params.serviceId;
    const staffId = params.staffId;
    const time = params.time;
    if (!date || !serviceId || !staffId || !time) return;
    const serviceData = await getServiceDoc(tenantId, serviceId);
    const staffData = staffId === "any" ? null : await getStaffDoc(tenantId, staffId);
    const serviceName = (serviceData?.name as string) ?? "";
    const staffName = staffId === "any" ? "ไม่ระบุ" : ((staffData?.name as string) ?? "");
    const durationMinutes = (serviceData?.durationMinutes as number) ?? 60;
    const price = (serviceData?.price as number) ?? 0;
    const depositAmount = (serviceData?.depositAmount as number) ?? 0;
    if (depositAmount > 0) {
      if (tenant.depositMode === "auto") {
        const chargePercent = await getChargePercent();
        const chargeAmount =
          Math.round(depositAmount * (chargePercent / 100) * 100) / 100;
        const totalAmount = depositAmount + chargeAmount;
        const contents: FlexContainer = {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "ชำระค่ามัดจำ",
                weight: "bold",
                size: "lg",
                color: "#ffffff",
              },
            ],
            backgroundColor: "#0D9488",
            paddingAll: "md",
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: `บริการ: ${serviceName}`,
                size: "sm",
                wrap: true,
              },
              {
                type: "text",
                text: `ราคาบริการ: ฿${price.toLocaleString()}`,
                size: "sm",
                wrap: true,
                margin: "xs",
              },
              {
                type: "text",
                text: `ช่าง: ${staffName}`,
                size: "sm",
                wrap: true,
                margin: "xs",
              },
              {
                type: "text",
                text: `วันที่: ${date}`,
                size: "sm",
                wrap: true,
                margin: "xs",
              },
              {
                type: "text",
                text: `เวลา: ${time}`,
                size: "sm",
                wrap: true,
                margin: "xs",
              },
              { type: "separator", margin: "md" },
              {
                type: "text",
                text: `ค่ามัดจำ: ฿${depositAmount.toLocaleString()}`,
                size: "sm",
                wrap: true,
                margin: "xs",
              },
              {
                type: "text",
                text: `ค่าธรรมเนียม (${chargePercent.toFixed(
                  2
                )}%): ฿${chargeAmount.toLocaleString()}`,
                size: "sm",
                wrap: true,
                margin: "xs",
              },
              { type: "separator", margin: "md" },
              {
                type: "text",
                text: `ยอดชำระทั้งหมด: ฿${totalAmount.toLocaleString()}`,
                weight: "bold",
                size: "md",
                wrap: true,
                margin: "md",
              },
            ],
            paddingAll: "md",
          },
          footer: {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "postback",
                  label: "ชำระเงิน",
                  data: `action=pay_deposit_auto&serviceId=${serviceId}&staffId=${staffId}&date=${date}&time=${time}&amount=${depositAmount}&total=${totalAmount}`,
                },
              },
              {
                type: "button",
                action: {
                  type: "postback",
                  label: "ยกเลิก",
                  data: "action=cancel_flow",
                },
              },
            ],
            paddingAll: "md",
          },
        };
        await sendLineReply(event.replyToken, [
          { type: "flex", altText: "ชำระค่ามัดจำ", contents },
        ]);
        return;
      }
      const bankName = (tenant.bankName as string) ?? "";
      const bankAccountNumber = (tenant.bankAccountNumber as string) ?? "";
      const bankAccountName = (tenant.bankAccountName as string) ?? "";
      const promptPayNumber = (tenant.promptPayNumber as string) ?? "";
      const manualFlex: FlexContainer = {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "ชำระค่ามัดจำ",
              weight: "bold",
              size: "lg",
              color: "#ffffff",
            },
          ],
          backgroundColor: "#0D9488",
          paddingAll: "md",
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `บริการ: ${serviceName}`,
              size: "sm",
              wrap: true,
            },
            {
              type: "text",
              text: `ช่าง: ${staffName}`,
              size: "sm",
              wrap: true,
              margin: "xs",
            },
            {
              type: "text",
              text: `วันที่: ${date}`,
              size: "sm",
              wrap: true,
              margin: "xs",
            },
            {
              type: "text",
              text: `เวลา: ${time}`,
              size: "sm",
              wrap: true,
              margin: "xs",
            },
            { type: "separator", margin: "md" },
            {
              type: "text",
              text: `ค่ามัดจำ: ฿${depositAmount.toLocaleString()}`,
              size: "sm",
              wrap: true,
              margin: "xs",
            },
            { type: "separator", margin: "md" },
            {
              type: "text",
              text: "กรุณาโอนเงินมาที่:",
              size: "sm",
              weight: "bold",
              wrap: true,
              margin: "md",
            },
            {
              type: "text",
              text: `ธนาคาร: ${bankName || "-"}`,
              size: "sm",
              wrap: true,
            },
            {
              type: "text",
              text: `เลขบัญชี: ${bankAccountNumber || "-"}`,
              size: "sm",
              wrap: true,
            },
            {
              type: "text",
              text: `ชื่อบัญชี: ${bankAccountName || "-"}`,
              size: "sm",
              wrap: true,
            },
            promptPayNumber
              ? {
                  type: "text",
                  text: `PromptPay: ${promptPayNumber}`,
                  size: "sm",
                  wrap: true,
                }
              : null,
          ].filter(Boolean) as any[],
          paddingAll: "md",
        },
        footer: {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "button",
              style: "primary",
              action: {
                type: "postback",
                label: "ชำระเงิน (โอนเงิน)",
                data: `action=deposit_transferred&serviceId=${serviceId}&staffId=${staffId}&date=${date}&time=${time}`,
              },
            },
            {
              type: "button",
              action: {
                type: "postback",
                label: "ยกเลิก",
                data: "action=cancel_flow",
              },
            },
          ],
          paddingAll: "md",
        },
      };
      await sendLineReply(event.replyToken, [
        { type: "flex", altText: "ชำระค่ามัดจำ", contents: manualFlex },
      ]);
      return;
    }
    const flex = buildLineBookingSummaryFlex({
      date,
      serviceId,
      serviceName,
      staffId,
      staffName,
      time,
      durationMinutes,
      price,
    });
    await sendLineReply(event.replyToken, [
      { type: "flex", altText: "สรุปการจอง", contents: flex },
    ]);
    return;
  }

  if (action === "reschedule_select_time") {
    const bookingId = params.bookingId;
    const date = params.date;
    const time = params.time;
    if (!bookingId || !date || !time) return;
    const bookingRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(bookingId);
    const snap = await bookingRef.get();
    if (!snap.exists) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่พบการจอง" }]);
      return;
    }
    const current = snap.data() as Booking;
    if (current.tenantId !== tenantId || current.customerLineId !== lineUserId) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่สามารถเลื่อนนัดนี้ได้" }]);
      return;
    }
    const serviceId = current.serviceId;
    const serviceData = await getServiceDoc(tenantId, serviceId);
    const durationMinutes = (serviceData?.durationMinutes as number) ?? 60;
    const newEndTime = calculateEndTime(time, durationMinutes);
    await bookingRef.update({
      date,
      startTime: time,
      endTime: newEndTime,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await cancelReminder(tenantId, bookingId).catch(() => {});
    await scheduleReminder(tenantId, bookingId).catch(() => {});
    const updatedSnap = await bookingRef.get();
    const updated = { id: updatedSnap.id, ...(updatedSnap.data() as any) } as Booking;
    const flex = buildBookingConfirmedMessage(updated, tenant.name ?? "");
    await sendLineReply(event.replyToken, [
      { type: "flex", altText: "เลื่อนนัดสำเร็จ", contents: flex },
    ]);
    return;
  }

  if (action === "confirm_booking") {
    const date = params.date;
    const serviceId = params.serviceId;
    const staffId = params.staffId;
    const time = params.time;
    if (!date || !serviceId || !staffId || !time) return;
    const customer = await getOrCreateCustomer(tenantId, tenant, lineUserId);
    const serviceData = await getServiceDoc(tenantId, serviceId);
    const staffData = staffId === "any" ? null : await getStaffDoc(tenantId, staffId);
    const serviceName = (serviceData?.name as string) ?? "";
    const staffName = staffId === "any" ? "ไม่ระบุ" : ((staffData?.name as string) ?? "");
    try {
      const booking = await createBooking(tenantId, {
        customerId: customer.id,
        customerName: customer.displayName,
        customerLineId: lineUserId,
        customerPhone: customer.phone ?? "",
        serviceId,
        serviceName,
        staffId,
        staffName,
        date,
        startTime: time,
        notes: "",
      });
      const successFlex = buildBookingSuccessMessage({ ...booking, status: "open" });
      await sendLineReply(event.replyToken, [{ type: "flex", altText: "จองสำเร็จ รอการยืนยัน", contents: successFlex }]);
      await notifyAdminNewBooking(tenantId, booking).catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      await sendLineReply(event.replyToken, [{ type: "text", text: msg }]);
    }
    return;
  }

  if (action === "cancel_flow") {
    await sendLineReply(event.replyToken, [{ type: "text", text: "ยกเลิกการจองแล้ว กดจองคิวใหม่ได้เลยครับ" }]);
    return;
  }

  if (action === "my_bookings") {
    const customerSnap = await adminDb
      .collection("customers")
      .where("tenantId", "==", tenantId)
      .where("lineUserId", "==", lineUserId)
      .where("isActive", "==", true)
      .limit(1)
      .get();
    if (customerSnap.empty) return;
    const customerId = customerSnap.docs[0].id;
    const today = format(new Date(), "yyyy-MM-dd");
    const bookingsSnap = await adminDb
      .collection("bookings")
      .where("tenantId", "==", tenantId)
      .where("customerId", "==", customerId)
      .where("date", ">=", today)
      .orderBy("date")
      .limit(20)
      .get();
    const bookings = bookingsSnap.docs
      .filter((d) => {
        const s = d.data().status as string;
        return s === "open" || s === "confirmed";
      })
      .slice(0, 10)
      .map((d) => {
        const b = d.data();
        return {
          id: d.id,
          date: b.date as string,
          startTime: b.startTime as string,
          serviceName: b.serviceName as string,
          staffName: b.staffName as string,
        };
      })
      .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.startTime.localeCompare(b.startTime)));
    const flex = buildLineMyBookingsFlex(bookings);
    await sendLineReply(event.replyToken, [{ type: "flex", altText: "การจองของฉัน", contents: flex }]);
    return;
  }

  if (action === "pay_deposit_auto") {
    const serviceId = params.serviceId;
    const staffId = params.staffId;
    const date = params.date;
    const time = params.time;
    const amountStr = params.amount;
    const totalStr = params.total;
    if (!serviceId || !staffId || !date || !time || !amountStr || !totalStr)
      return;
    const total = parseFloat(totalStr);
    const depositAmount = parseFloat(amountStr);
    if (!Number.isFinite(total) || total <= 0) return;
    console.log("pay_deposit_auto triggered", params);
    const secretKey = process.env.OMISE_SECRET_KEY;
    const authHeader =
      "Basic " + Buffer.from(String(secretKey) + ":").toString("base64");
    const satang = Math.round(total * 100);
    const sourceRes = await fetch("https://api.omise.co/sources", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        type: "promptpay",
        amount: String(satang),
        currency: "thb",
      }),
    });
    const source: any = await sourceRes.json();
    console.log("Omise source response:", source);
    if (source.object === "error") {
      throw new Error(String(source.message || "Omise source error"));
    }
    const chargeRes = await fetch("https://api.omise.co/charges", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(satang),
        currency: "thb",
        source: String(source.id),
        "metadata[tenantId]": tenantId,
        "metadata[lineUserId]": lineUserId || "",
        "metadata[serviceId]": serviceId || "",
        "metadata[date]": date || "",
        "metadata[depositAmount]": String(depositAmount),
      }),
    });
    const charge: any = await chargeRes.json();
    console.log("Omise charge response:", charge);
    if (charge.object === "error") {
      throw new Error(String(charge.message || "Omise charge error"));
    }
    console.log(
      "QR code data:",
      JSON.stringify(charge.source?.scannable_code, null, 2)
    );
    const scannable = charge.source?.scannable_code;
    const rawQrUrl: string =
      (scannable &&
        scannable.image &&
        (scannable.image.download_uri || scannable.image.url)) ||
      "";
    console.log("QR code URL (raw):", rawQrUrl);
    const qrUrl =
      (await getOmiseQrPublicUrl(
        rawQrUrl,
        process.env.OMISE_SECRET_KEY || ""
      )) || "";
    if (!qrUrl) {
      await sendLineReply(event.replyToken, [
        {
          type: "text",
          text: `กรุณาชำระเงินจำนวน ฿${total.toLocaleString()} ผ่าน PromptPay`,
        },
      ]);
      return;
    }
    const pendingRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("pendingDeposits")
      .doc(charge.id);
    await pendingRef.set({
      lineUserId,
      serviceId,
      staffId,
      date,
      time,
      depositAmount,
      totalAmount: total,
      chargeId: charge.id,
      status: "pending",
      mode: "auto",
      createdAt: FieldValue.serverTimestamp(),
    });
    const flex: FlexContainer = {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "สแกนเพื่อชำระเงิน",
            weight: "bold",
            size: "lg",
            color: "#ffffff",
          },
        ],
        backgroundColor: "#0D9488",
        paddingAll: "md",
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "image",
            url: qrUrl,
            size: "full",
            aspectRatio: "1:1",
            aspectMode: "cover",
          },
          {
            type: "text",
            text: `ยอดชำระ: ฿${total.toLocaleString()}`,
            size: "md",
            weight: "bold",
            wrap: true,
          },
          {
            type: "text",
            text: "กรุณาสแกน QR Code ด้านบน",
            size: "sm",
            wrap: true,
          },
          {
            type: "text",
            text: "ระบบจะตรวจสอบอัตโนมัติ ✨",
            size: "sm",
            wrap: true,
          },
        ],
        paddingAll: "md",
      },
    };
    await sendLineReply(event.replyToken, [
      { type: "flex", altText: "ชำระเงินมัดจำ", contents: flex },
    ]);
    return;
  }

  if (action === "deposit_transferred") {
    const serviceId = params.serviceId;
    const staffId = params.staffId;
    const date = params.date;
    const time = params.time;
    if (!serviceId || !staffId || !date || !time) return;
    const serviceData = await getServiceDoc(tenantId, serviceId);
    const depositAmount = (serviceData?.depositAmount as number) ?? 0;
    const depositsCol = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("pendingDeposits");
    const pendingRef = depositsCol.doc();
    const pendingId = pendingRef.id;
    await pendingRef.set({
      lineUserId,
      serviceId,
      staffId,
      date,
      time,
      depositAmount,
      status: "waiting_slip",
      mode: "manual",
      createdAt: FieldValue.serverTimestamp(),
    });
    const stateRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("customerStates")
      .doc(lineUserId);
    await stateRef.set({
      state: "waiting_slip",
      serviceId,
      staffId,
      date,
      time,
      pendingDepositId: pendingId,
      depositAmount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await sendLineReply(event.replyToken, [
      {
        type: "text",
        text: "กรุณาส่งรูปสลิปการโอนเงินมาที่แชทนี้เลยครับ 📸",
      },
    ]);
    return;
  }

  if (action === "verify_deposit") {
    const depositId = params.depositId;
    const customerId = params.customerId;
    if (!depositId || !customerId) return;
    const depositRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("pendingDeposits")
      .doc(depositId);
    const depositSnap = await depositRef.get();
    const depositData = depositSnap.data() || {};
    const depositAmount = Number(depositData.depositAmount ?? 0) || 0;
    const serviceId = depositData.serviceId as string;
    const staffId = (depositData.staffId as string) || "any";
    const date = depositData.date as string;
    const time = depositData.time as string;
    const lineUserId = (depositData.lineUserId as string) || customerId;
    if (!serviceId || !date || !time || depositAmount <= 0) return;
    await depositRef.update({
      status: "verified",
      updatedAt: FieldValue.serverTimestamp(),
    });
    const serviceData = await getServiceDoc(tenantId, serviceId);
    const staffData = staffId === "any" ? null : await getStaffDoc(tenantId, staffId);
    const price = (serviceData?.price as number) ?? 0;
    const durationMinutes = (serviceData?.durationMinutes as number) ?? 60;
    const serviceName = (serviceData?.name as string) ?? "";
    const staffName = staffId === "any" ? "ไม่ระบุ" : ((staffData?.name as string) ?? "");
    const remainingAmount = Math.max(price - depositAmount, 0);
    const endTime = calculateEndTime(time, durationMinutes);
    const profile = await getLineProfile(tenant, lineUserId);
    const bookingRef = await adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .add({
      tenantId,
      customerId: lineUserId,
      customerName: profile.displayName ?? "",
      customerLineId: lineUserId,
      serviceId,
      serviceName,
      staffId,
      staffName,
      date,
      startTime: time,
      endTime,
      status: "confirmed",
      depositAmount,
      depositStatus: "paid",
      depositPaidAt: FieldValue.serverTimestamp(),
      remainingAmount,
      remainingStatus: remainingAmount > 0 ? "pending" : "paid",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await adminDb.collection("depositTransactions").add({
      tenantId,
      tenantName: tenant.name ?? "",
      bookingId: bookingRef.id,
      customerId: lineUserId,
      customerName: profile.displayName ?? "",
      serviceName,
      amount: depositAmount,
      totalCharged: depositAmount,
      chargePercent: 0,
      chargeAmount: 0,
      omiseFee: 0,
      shopReceiveAmount: depositAmount,
      superAdminReceiveAmount: 0,
      mode: "manual",
      status: "completed",
      createdAt: FieldValue.serverTimestamp(),
    });
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenant.lineChannelAccessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "text",
            text: `🎉 จองสำเร็จ!\n\nบริการ: ${serviceName}\nช่าง: ${staffName}\nวันที่: ${date}\nเวลา: ${time}\n\n💰 ชำระมัดจำแล้ว: ฿${depositAmount.toLocaleString()}\n💵 ยอดคงเหลือชำระที่ร้าน: ฿${remainingAmount.toLocaleString()}`,
          },
        ],
      }),
    });
    await sendLineReply(event.replyToken, [
      {
        type: "text",
        text: `✅ ยืนยันมัดจำเรียบร้อย\n\nลูกค้า: ${profile.displayName ?? ""}\nบริการ: ${serviceName}\nวันที่: ${date} เวลา: ${time}\nมัดจำ: ฿${depositAmount.toLocaleString()}\n\nระบบสร้างการจองให้แล้ว`,
      },
    ]);
    return;
  }

  if (action === "reject_deposit") {
    const depositId = params.depositId;
    const customerId = params.customerId;
    if (!depositId || !customerId) return;
    const depositRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("pendingDeposits")
      .doc(depositId);
    await depositRef.update({
      status: "rejected",
      updatedAt: FieldValue.serverTimestamp(),
    });
    const stateRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("customerStates")
      .doc(customerId);
    await stateRef.set({
      state: "waiting_slip",
      pendingDepositId: depositId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tenant.lineChannelAccessToken}`,
      },
      body: JSON.stringify({
        to: customerId,
        messages: [
          {
            type: "text",
            text: "สลิปไม่ถูกต้อง ❌\nกรุณาโอนเงินใหม่และส่งรูปสลิปมาอีกครั้งครับ",
          },
        ],
      }),
    });
    await sendLineReply(event.replyToken, [
      {
        type: "text",
        text: "❌ ปฏิเสธสลิปแล้ว ระบบแจ้งลูกค้าให้ส่งสลิปใหม่แล้ว",
      },
    ]);
    return;
  }

  if (action === "cancel_booking") {
    const bookingId = params.bookingId;
    if (!bookingId) return;
    const bookingRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(bookingId);
    const snap = await bookingRef.get();
    if (!snap.exists) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่พบการจอง" }]);
      return;
    }
    const b = snap.data();
    if (b?.tenantId !== tenantId || (b?.customerLineId as string) !== lineUserId) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่พบการจอง" }]);
      return;
    }
    const flex = buildLineCancelConfirmFlex(bookingId);
    await sendLineReply(event.replyToken, [{ type: "flex", altText: "ยกเลิกการจอง?", contents: flex }]);
    return;
  }

  if (action === "cancel_booking_confirm") {
    const bookingId = params.bookingId;
    if (!bookingId) return;
    try {
      const booking = await cancelBooking(tenantId, bookingId, lineUserId);
      await sendLineReply(event.replyToken, [{ type: "text", text: "ยกเลิกการจองแล้ว" }]);
      await notifyAdminBookingCancelledByUser(tenantId, booking).catch(() => {});
    } catch {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่สามารถยกเลิกได้" }]);
    }
    return;
  }

  if (data.startsWith("reschedule:") && !params.action) {
    const bookingId = data.replace("reschedule:", "").trim();
    if (!bookingId) return;
    const bookingRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(bookingId);
    const snap = await bookingRef.get();
    if (!snap.exists) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่พบการจอง" }]);
      return;
    }
    const rb = snap.data() as Booking;
    if (rb.tenantId !== tenantId || rb.customerLineId !== lineUserId) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่สามารถเลื่อนนัดนี้ได้" }]);
      return;
    }
    if (rb.status !== "open" && rb.status !== "confirmed") {
      await sendLineReply(event.replyToken, [
        { type: "text", text: "นัดนี้ไม่สามารถเลื่อนได้ (สถานะไม่ใช่กำลังจะมาถึง)" },
      ]);
      return;
    }
    const flex = buildRescheduleWebEntryFlex(tenantId, bookingId);
    await sendLineReply(event.replyToken, [
      { type: "flex", altText: "เลื่อนนัด — เปิดหน้าเว็บ", contents: flex },
    ]);
    return;
  }

  if (data.startsWith("confirm_booking:")) {
    const bookingId = data.replace("confirm_booking:", "");
    const bookingRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่พบการจอง" }]);
      return;
    }
    const booking = { id: bookingSnap.id, ...bookingSnap.data() } as Booking;
    if (booking.tenantId !== tenantId || booking.customerLineId !== lineUserId) return;
    await bookingRef.update({
      status: "confirmed",
      updatedAt: FieldValue.serverTimestamp(),
    });
    const successFlex = buildBookingSuccessMessage({ ...booking, status: "confirmed" });
    await sendLineReply(event.replyToken, [{ type: "flex", altText: "จองสำเร็จ", contents: successFlex }]);
    return;
  }

  if (data.startsWith("cancel_booking:") && !params.action) {
    const bookingId = data.replace("cancel_booking:", "");
    const bookingRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      await sendLineReply(event.replyToken, [{ type: "text", text: "ไม่พบการจอง" }]);
      return;
    }
    const booking = { id: bookingSnap.id, ...bookingSnap.data() } as Booking;
    if (booking.tenantId !== tenantId || booking.customerLineId !== lineUserId) return;
    await bookingRef.update({
      status: "user_cancelled",
      updatedAt: FieldValue.serverTimestamp(),
    });
    const cancelledFlex = buildBookingCancelledMessage({ ...booking, status: "user_cancelled" });
    await sendLineReply(event.replyToken, [{ type: "flex", altText: "ยกเลิกการจองแล้ว", contents: cancelledFlex }]);
    await notifyAdminBookingCancelledByUser(tenantId, { ...booking, status: "user_cancelled" }).catch(() => {});
  }
}
