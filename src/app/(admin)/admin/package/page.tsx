import { Suspense } from "react";
import { PackageClient } from "./PackageClient";

export default function AdminPackagePage() {
  return (
    <Suspense fallback={<div className="p-4">กำลังโหลด...</div>}>
      <PackageClient />
    </Suspense>
  );
}
