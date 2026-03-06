"use server";

import type { FlexContainer } from "@line/bot-sdk";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { buildLineStaffFlex } from "@/lib/line/messages";

async function getTenantById(tenantId: string) {
  const snap = await adminDb.collection("tenants").doc(tenantId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as any;
}

async function getTenantStaffForService(tenantId: string, serviceId: string) {
  const staff: { id: string; name: string; serviceIds: string[] }[] = [];
  const subSnap = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("staff")
    .where("isActive", "==", true)
    .get();
  if (!subSnap.empty) {
    subSnap.forEach((d) => {
      const data = d.data();
      const serviceIds = (data.serviceIds as string[]) ?? [];
      if (serviceIds.includes(serviceId)) {
        staff.push({ id: d.id, name: (data.name as string) ?? "", serviceIds });
      }
    });
  } else {
    const topSnap = await adminDb
      .collection("staff")
      .where("tenantId", "==", tenantId)
      .where("isActive", "==", true)
      .get();
    topSnap.forEach((d) => {
      const data = d.data();
      const serviceIds = (data.serviceIds as string[]) ?? [];
      if (serviceIds.includes(serviceId)) {
        staff.push({ id: d.id, name: (data.name as string) ?? "", serviceIds });
      }
    });
  }
  return staff.map((s) => ({ id: s.id, name: s.name }));
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

async function getChargeConfig() {
  const snap = await adminDb
    .collection("systemSettings")
    .doc("chargeConfig")
    .get();
  const data = snap.exists ? snap.data() || {} : {};
  const omiseFeePercent = (data.omiseFeePercent as number) ?? 3.65;
  const additionalFeePercent = (data.additionalFeePercent as number) ?? 1.0;
  const chargePercent =
    (data.chargePercent as number) ?? omiseFeePercent + additionalFeePercent;
  return { omiseFeePercent, additionalFeePercent, chargePercent };
}

async function getServiceDoc(tenantId: string, serviceId: string) {
  const subSnap = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("services")
    .doc(serviceId)
    .get();
  if (subSnap.exists) return subSnap;
  return adminDb.collection("services").doc(serviceId).get();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Omise webhook:", body.key, body.data?.status);

    if (body.key === "charge.complete" && body.data?.status === "successful") {
      const metadata = body.data.metadata ?? {};
      const tenantId = metadata.tenantId as string;
      const lineUserId = metadata.lineUserId as string;
      const serviceId = metadata.serviceId as string;
      const date = metadata.date as string;
      if (!tenantId || !lineUserId || !serviceId || !date) {
        return new Response("OK", { status: 200 });
      }

      const depositsRef = adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection("pendingDeposits");
      const snapshot = await depositsRef
        .where("chargeId", "==", body.data.id)
        .limit(1)
        .get();

      let pendingDepositData: any | null = null;
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        pendingDepositData = { id: doc.id, ...doc.data() };
        await doc.ref.update({
          status: "completed",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const tenant = await getTenantById(tenantId);
      if (!tenant) return new Response("OK", { status: 200 });

      if (pendingDepositData) {
        const depositAmount = Number(pendingDepositData.depositAmount ?? 0) || 0;
        const staffId = pendingDepositData.staffId as string;
        const time = pendingDepositData.time as string;
        if (depositAmount > 0 && staffId && time) {
          const { omiseFeePercent, additionalFeePercent, chargePercent } =
            await getChargeConfig();
          const totalCharged = depositAmount * (1 + chargePercent / 100);
          const base = depositAmount;
          const chargeAmount = totalCharged - base;
          const omiseFeeRaw =
            totalCharged * (omiseFeePercent / (100 + chargePercent));
          const superAdminRaw =
            totalCharged * (additionalFeePercent / (100 + chargePercent));
          const omiseFee = Math.round(omiseFeeRaw * 100) / 100;
          const superAdminReceiveAmount =
            Math.round(superAdminRaw * 100) / 100;
          const shopReceiveAmount = base;

          const profileRes = await fetch(
            `https://api.line.me/v2/bot/profile/${lineUserId}`,
            {
              headers: {
                Authorization: `Bearer ${tenant.lineChannelAccessToken}`,
              },
            }
          );
          const profile = await profileRes
            .json()
            .catch(() => ({} as any));
          const serviceSnap = await getServiceDoc(tenantId, serviceId);
          const serviceData = serviceSnap.exists ? serviceSnap.data() || {} : {};
          const staffList = await getTenantStaffForService(tenantId, serviceId);
          const staff = staffList.find((s) => s.id === staffId) ?? staffList[0];
          const price = (serviceData.price as number) ?? 0;
          const durationMinutes = (serviceData.durationMinutes as number) ?? 60;
          const serviceName = (serviceData.name as string) ?? "";
          const staffName = staff?.name ?? "";
          const remainingAmount = Math.max(price - depositAmount, 0);
          const endTime = calculateEndTime(time, durationMinutes);

          const bookingRef = await adminDb
            .collection("tenants")
            .doc(tenantId)
            .collection("bookings")
            .add({
            tenantId,
            customerId: lineUserId,
            customerName: profile?.displayName ?? "",
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
            depositChargeId: body.data.id as string,
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
            customerName: profile?.displayName ?? "",
            serviceName,
            amount: depositAmount,
            totalCharged,
            chargePercent,
            chargeAmount,
            omiseFee,
            shopReceiveAmount,
            superAdminReceiveAmount,
            mode: "auto",
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
                  text: `จองสำเร็จ ✅\nบริการ: ${serviceName}\nช่าง: ${staffName}\nวันที่: ${date}\nเวลา: ${time}`,
                },
              ],
            }),
          });
        }
      }
    }

    if (body.key === "charge.complete" && body.data?.status === "failed") {
      const metadata = body.data.metadata ?? {};
      const tenantId = metadata.tenantId as string;
      const lineUserId = metadata.lineUserId as string;
      if (tenantId && lineUserId) {
        const tenant = await getTenantById(tenantId);
        if (tenant) {
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
                  text: "การชำระเงินไม่สำเร็จ ❌\nกรุณาลองใหม่อีกครั้งครับ",
                },
              ],
            }),
          });
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Omise webhook error:", err);
    return new Response("OK", { status: 200 });
  }
}

