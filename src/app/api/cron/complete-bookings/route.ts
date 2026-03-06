import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const CUTOFF_MS = 30 * 60 * 1000;

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const cutoff = now - CUTOFF_MS;
  const tenantsSnap = await adminDb.collection("tenants").get();
  let completed = 0;

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    const tenantData = tenantDoc.data();
    const lineToken = (tenantData.lineChannelAccessToken as string) ?? "";
    const bookingsSnap = await adminDb
      .collection("bookings")
      .where("tenantId", "==", tenantId)
      .where("status", "in", ["open", "confirmed"])
      .get();

    for (const doc of bookingsSnap.docs) {
      const d = doc.data();
      const date = d.date as string;
      const endTime = (d.endTime as string) ?? (d.startTime as string);
      const endStr = endTime.length <= 5 ? `${endTime}:00` : endTime;
      const bookingEnd = new Date(`${date}T${endStr}`).getTime();
      if (bookingEnd < cutoff) {
        const price = Number(d.price) || 0;
        const depositAmount = Number(d.depositAmount ?? 0) || 0;
        const remainingAmount = Math.max(price - depositAmount, 0);
        const updatePayload: Record<string, unknown> = {
          status: "completed",
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (depositAmount > 0 && remainingAmount > 0) {
          updatePayload.remainingAmount = remainingAmount;
          updatePayload.remainingStatus = "pending";
        }
        await doc.ref.update(updatePayload);
        // mirror to tenant subcollection if exists
        await adminDb
          .collection("tenants")
          .doc(tenantId)
          .collection("bookings")
          .doc(doc.id)
          .update(updatePayload)
          .catch(() => {});
        if (depositAmount > 0 && remainingAmount > 0 && lineToken && d.customerLineId) {
          const serviceName = (d.serviceName as string) ?? "";
          const body = {
            type: "flex",
            altText: "สรุปค่าบริการ",
            contents: {
              type: "bubble",
              header: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "สรุปค่าบริการ",
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
                    type: "text",
                    text: "✅ บริการเสร็จสิ้น",
                    size: "md",
                    weight: "bold",
                    wrap: true,
                  },
                  { type: "separator", margin: "md" },
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
                  },
                  {
                    type: "text",
                    text: `จ่ายมัดจำแล้ว: -฿${depositAmount.toLocaleString()}`,
                    size: "sm",
                    color: "#10B981",
                    wrap: true,
                  },
                  {
                    type: "separator",
                    margin: "md",
                  },
                  {
                    type: "text",
                    text: `ยอดคงเหลือ: ฿${remainingAmount.toLocaleString()}`,
                    weight: "bold",
                    size: "xl",
                    color: "#EF4444",
                    wrap: true,
                  },
                  { type: "separator", margin: "md" },
                  {
                    type: "text",
                    text: "กรุณาชำระเงินส่วนที่เหลือที่ร้านครับ",
                    size: "sm",
                    wrap: true,
                  },
                ],
              },
              footer: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "ขอบคุณที่ใช้บริการ 🙏",
                    size: "sm",
                    align: "center",
                    wrap: true,
                  },
                ],
                paddingAll: "md",
              },
            },
          };
          await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lineToken}`,
            },
            body: JSON.stringify({
              to: d.customerLineId as string,
              messages: [body],
            }),
          }).catch(() => {});
        }
        completed += 1;
      }
    }
  }

  return NextResponse.json({ ok: true, completed });
}
