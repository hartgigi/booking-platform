import { Suspense } from "react";
import { PackageSuccessClient } from "./PackageSuccessClient";

export default function PackageSuccessPage() {
  return (
    <Suspense fallback={<div className="p-4">กำลังโหลด...</div>}>
      <PackageSuccessClient />
    </Suspense>
  );
}
