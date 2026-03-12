import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, shopName, businessType, trial } = body as {
      idToken?: string;
      shopName?: string;
      businessType?: string;
      trial?: boolean;
    };
    if (!idToken || !shopName || typeof businessType !== "string") {
      return NextResponse.json(
        { error: "Missing idToken, shopName or businessType" },
        { status: 400 }
      );
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email ?? "";
    if (!email) {
      return NextResponse.json({ error: "No email in token" }, { status: 401 });
    }
    const existing = await adminDb
      .collection("tenants")
      .where("adminEmail", "==", email)
      .limit(1)
      .get();
    if (!existing.empty) {
      return NextResponse.json(
        { error: "Email already registered as admin" },
        { status: 400 }
      );
    }
    const tenantRef = adminDb.collection("tenants").doc();
    const now = FieldValue.serverTimestamp();
    const isTrial = Boolean(trial);
    const trialDays = 15;
    const expiryDate = isTrial ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;
    await tenantRef.set({
      name: String(shopName).trim(),
      businessType,
      adminEmail: email,
      lineOaId: "",
      lineChannelAccessToken: "",
      lineChannelSecret: "",
      adminLineUserId: "",
      logoUrl: "",
      coverImageUrl: "",
      address: "",
      phone: "",
      openDays: [1, 2, 3, 4, 5, 6],
      openTime: "09:00",
      closeTime: "20:00",
      slotDurationMinutes: 60,
      isActive: true,
      plan: isTrial ? "trial" : "trial",
      licenseExpiry: expiryDate ? new Date(expiryDate) : null,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ tenantId: tenantRef.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Registration failed" },
      { status: 500 }
    );
  }
}
