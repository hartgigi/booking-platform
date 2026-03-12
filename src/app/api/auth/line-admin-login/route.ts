import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const lineUserId = String(body.lineUserId ?? "").trim();
    const tenantId = String(body.tenantId ?? "").trim();

    if (!lineUserId || !tenantId) {
      return NextResponse.json(
        { error: "lineUserId and tenantId are required" },
        { status: 400 }
      );
    }

    const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const tenant = tenantDoc.data() || {};
    const adminLineUserId = String(tenant.adminLineUserId ?? "").trim();

    if (!adminLineUserId || adminLineUserId !== lineUserId) {
      return NextResponse.json(
        { error: "LINE user is not the owner of this tenant" },
        { status: 403 }
      );
    }

    // Find Firebase user by email (adminEmail) or create a minimal one if not exists
    const adminEmail = String(tenant.adminEmail ?? "").trim();
    let uid: string;

    if (adminEmail) {
      const userSnap = await adminDb
        .collection("users")
        .where("email", "==", adminEmail)
        .limit(1)
        .get();
      if (!userSnap.empty) {
        uid = userSnap.docs[0].id;
      } else {
        const userRecord = await adminAuth.getUserByEmail(adminEmail).catch(() => null);
        if (userRecord) {
          uid = userRecord.uid;
        } else {
          const created = await adminAuth.createUser({
            email: adminEmail,
            emailVerified: true,
            disabled: false,
          });
          uid = created.uid;
          await adminDb.collection("users").doc(uid).set(
            {
              email: adminEmail,
              createdAt: new Date(),
            },
            { merge: true }
          );
        }
      }
    } else {
      // Fallback: one pseudo-user per tenant based on tenant id
      uid = `tenant-${tenantId}`;
      await adminDb
        .collection("users")
        .doc(uid)
        .set(
          {
            createdAt: new Date(),
          },
          { merge: true }
        );
    }

    const customToken = await adminAuth.createCustomToken(uid, { tenantId });
    return NextResponse.json({ customToken });
  } catch (err) {
    console.error("line-admin-login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

