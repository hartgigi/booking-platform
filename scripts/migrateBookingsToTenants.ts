import { adminDb } from "@/lib/firebase/admin";

async function migrate() {
  const topSnap = await adminDb.collection("bookings").get();
  console.log("Found top-level bookings:", topSnap.size);
  for (const doc of topSnap.docs) {
    const data = doc.data();
    const tenantId = data.tenantId as string | undefined;
    if (!tenantId) {
      console.log("Skipping booking without tenantId:", doc.id);
      continue;
    }
    const targetRef = adminDb
      .collection("tenants")
      .doc(tenantId)
      .collection("bookings")
      .doc(doc.id);
    const targetSnap = await targetRef.get();
    if (targetSnap.exists) {
      console.log("Target already exists, skipping:", doc.id);
      continue;
    }
    console.log("Migrating booking:", doc.id, "to tenant:", tenantId);
    await targetRef.set(data, { merge: false });
  }
  console.log("Migration complete");
}

migrate().catch((err) => {
  console.error("Migration error:", err);
});

