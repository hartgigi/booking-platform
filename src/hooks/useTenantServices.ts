import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Service } from "@/types";
import type { Timestamp } from "firebase/firestore";

const COLLECTION = "services";

function toService(id: string, data: Record<string, unknown>): Service {
  return {
    id,
    tenantId: data.tenantId as string,
    name: data.name as string,
    description: (data.description as string) ?? "",
    durationMinutes: data.durationMinutes as number,
    price: data.price as number,
    depositAmount: (data.depositAmount as number) ?? 0,
    imageUrl: (data.imageUrl as string) ?? "",
    isActive: (data.isActive as boolean) ?? true,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

export function useTenantServices(tenantId: string | null) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setServices([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, COLLECTION),
      where("tenantId", "==", tenantId),
      orderBy("createdAt", "desc")
    );
    const unsub: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => toService(d.id, d.data()))
          .filter((s) => s.isActive);
        setServices(list);
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tenantId]);

  return { services, loading, error };
}
