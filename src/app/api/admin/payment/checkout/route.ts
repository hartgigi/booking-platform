import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getPackageById } from "@/lib/packages";

async function getTenantIdFromToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email ?? "";
    if (!email) return null;
    const snapshot = await adminDb
      .collection("tenants")
      .where("adminEmail", "==", email)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].id;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "ระบบชำระเงินยังไม่พร้อมใช้งาน" },
      { status: 503 }
    );
  }
  const stripe = new Stripe(stripeKey);
  const tenantId = await getTenantIdFromToken(request);
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { packageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const pkg = getPackageById(body.packageId ?? "");
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      currency: "thb",
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: pkg.name,
              description: `JongMe แพ็คเกจ ${pkg.name}`,
            },
            unit_amount: pkg.price * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/admin/package/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/admin/package?cancel=true`,
      metadata: {
        tenantId,
        packageId: pkg.id,
        durationDays: String(pkg.durationDays),
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
