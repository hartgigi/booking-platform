import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST() {
  try {
    const topLevelBookings = await adminDb.collection("bookings").get();
    console.log("Found", topLevelBookings.size, "bookings to migrate");

    let migrated = 0;
    for (const doc of topLevelBookings.docs) {
      const data = doc.data();
      const tenantId = data.tenantId as string | undefined;
      if (!tenantId) continue;

      await adminDb
        .collection("tenants")
        .doc(tenantId)
        .collection("bookings")
        .doc(doc.id)
        .set(data);

      await adminDb.collection("bookings").doc(doc.id).delete();

      migrated++;
      console.log("Migrated booking:", doc.id, "to tenant:", tenantId);
    }

    return NextResponse.json({
      success: true,
      migrated,
      total: topLevelBookings.size,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed" },
      { status: 500 }
    );
  }
}

