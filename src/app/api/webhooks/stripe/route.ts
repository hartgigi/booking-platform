import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { PACKAGE_ID_TO_PLAN, getPackageById } from "@/lib/packages";
import type { TenantPlan } from "@/types";

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "ระบบชำระเงินยังไม่พร้อมใช้งาน" },
      { status: 503 }
    );
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }
  const stripe = new Stripe(stripeKey);
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const tenantId = session.metadata?.tenantId;
  const packageId = session.metadata?.packageId;
  const durationDays = session.metadata?.durationDays
    ? parseInt(session.metadata.durationDays, 10)
    : 0;
  if (!tenantId || !packageId || !durationDays) {
    console.error("Missing metadata in Stripe session");
    return NextResponse.json({ error: "Bad metadata" }, { status: 400 });
  }
  const pkg = getPackageById(packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Unknown package" }, { status: 400 });
  }
  const plan = PACKAGE_ID_TO_PLAN[packageId as keyof typeof PACKAGE_ID_TO_PLAN] as TenantPlan;
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const data = tenantSnap.data();
  const currentExpiry = data?.licenseExpiry as { toDate?: () => Date } | null | undefined;
  let baseDate: Date;
  if (currentExpiry?.toDate) {
    const exp = currentExpiry.toDate();
    baseDate = exp.getTime() > Date.now() ? exp : new Date();
  } else {
    baseDate = new Date();
  }
  const newExpiry = addDays(baseDate, durationDays);
  await tenantRef.update({
    licenseExpiry: Timestamp.fromDate(newExpiry),
    plan,
    updatedAt: Timestamp.now(),
  });
  const paymentRef = adminDb.collection("tenants").doc(tenantId).collection("payments").doc();
  const amount = session.amount_total != null ? session.amount_total / 100 : pkg.price;
  await paymentRef.set({
    amount: Number(amount),
    packageId,
    packageName: pkg.name,
    stripeSessionId: session.id,
    createdAt: Timestamp.now(),
    status: "success",
  });
  return NextResponse.json({ received: true });
}
