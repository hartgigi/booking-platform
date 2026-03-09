import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

async function getTenantRefFromToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const decoded = await adminAuth.verifyIdToken(token);
  const email = decoded.email ?? "";
  if (!email) return null;
  const snapshot = await adminDb
    .collection("tenants")
    .where("adminEmail", "==", email)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return snapshot.docs[0];
}

export async function GET(request: NextRequest) {
  try {
    const doc = await getTenantRefFromToken(request);
    if (!doc) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = doc.data();
    return NextResponse.json({
      id: doc.id,
      name: (data?.name as string) ?? "",
      phone: (data?.phone as string) ?? "",
      address: (data?.address as string) ?? "",
      openTime: (data?.openTime as string) ?? "09:00",
      closeTime: (data?.closeTime as string) ?? "18:00",
      openDays: (data?.openDays as number[]) ?? [1, 2, 3, 4, 5, 6],
      lineChannelAccessToken: (data?.lineChannelAccessToken as string) ?? "",
      lineChannelSecret: (data?.lineChannelSecret as string) ?? "",
      adminLineUserId: (data?.adminLineUserId as string) ?? "",
      bankName: (data?.bankName as string) ?? "",
      bankAccountNumber: (data?.bankAccountNumber as string) ?? "",
      bankAccountName: (data?.bankAccountName as string) ?? "",
      promptPayNumber: (data?.promptPayNumber as string) ?? "",
      depositMode: (data?.depositMode as "auto" | "manual") ?? "manual",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const doc = await getTenantRefFromToken(request);
    if (!doc) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantRef = doc.ref;
    const body = await request.json();
    const {
      lineChannelAccessToken,
      lineChannelSecret,
      name,
      phone,
      address,
      openTime,
      closeTime,
      openDays,
      adminLineUserId,
      bankName,
      bankAccountNumber,
      bankAccountName,
      promptPayNumber,
      depositMode,
    } = body as {
      lineChannelAccessToken?: string;
      lineChannelSecret?: string;
      name?: string;
      phone?: string;
      address?: string;
      openTime?: string;
      closeTime?: string;
      openDays?: number[];
      adminLineUserId?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankAccountName?: string;
      promptPayNumber?: string;
      depositMode?: "auto" | "manual";
    };
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (typeof lineChannelAccessToken === "string") {
      updates.lineChannelAccessToken = lineChannelAccessToken;
    }
    if (typeof lineChannelSecret === "string") {
      updates.lineChannelSecret = lineChannelSecret;
    }
    if (typeof name === "string") updates.name = name;
    if (typeof phone === "string") updates.phone = phone;
    if (typeof address === "string") updates.address = address;
    if (typeof openTime === "string") updates.openTime = openTime;
    if (typeof closeTime === "string") updates.closeTime = closeTime;
    if (Array.isArray(openDays)) updates.openDays = openDays;
    if (typeof adminLineUserId === "string") updates.adminLineUserId = adminLineUserId;
    if (typeof bankName === "string") updates.bankName = bankName;
    if (typeof bankAccountNumber === "string") updates.bankAccountNumber = bankAccountNumber;
    if (typeof bankAccountName === "string") updates.bankAccountName = bankAccountName;
    if (typeof promptPayNumber === "string") updates.promptPayNumber = promptPayNumber;
    if (depositMode === "auto" || depositMode === "manual") updates.depositMode = depositMode;
    await tenantRef.update(updates);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 401 });
  }
}
