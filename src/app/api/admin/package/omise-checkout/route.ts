import { NextRequest, NextResponse } from "next/server";
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
  const omiseSecretKey = process.env.OMISE_SECRET_KEY;
  if (!omiseSecretKey) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า OMISE_SECRET_KEY" },
      { status: 503 }
    );
  }

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

  try {
    const basicAuth = Buffer.from(omiseSecretKey + ":").toString("base64");
    const amountSatang = pkg.price * 100;

    // สร้าง PromptPay source
    const sourceRes = await fetch("https://api.omise.co/sources", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        type: "promptpay",
        amount: String(amountSatang),
        currency: "thb",
      }).toString(),
    });
    const source = await sourceRes.json();
    if (source.object === "error") {
      console.error("Omise source error:", source);
      return NextResponse.json(
        { error: "ไม่สามารถสร้างคำขอชำระเงินได้" },
        { status: 500 }
      );
    }

    // สร้าง charge สำหรับแพ็คเกจร้านค้า
    const chargeRes = await fetch("https://api.omise.co/charges", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(amountSatang),
        currency: "thb",
        source: String(source.id),
        "metadata[tenantId]": tenantId,
        "metadata[packageId]": pkg.id,
        "metadata[mode]": "tenantPackage",
      }).toString(),
    });
    const charge = await chargeRes.json();
    if (charge.object === "error") {
      console.error("Omise charge error:", charge);
      return NextResponse.json(
        { error: "ไม่สามารถสร้างคำขอชำระเงินได้" },
        { status: 500 }
      );
    }

    const scannable = charge.source?.scannable_code;
    const qrUrl: string | undefined =
      scannable?.image?.download_uri || scannable?.image?.url;

    if (!qrUrl) {
      return NextResponse.json(
        { error: "ไม่พบ QR Code สำหรับการชำระเงิน" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      qrUrl,
      amount: pkg.price,
    });
  } catch (err) {
    console.error("Omise package checkout error:", err);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างคำขอชำระเงินได้" },
      { status: 500 }
    );
  }
}

