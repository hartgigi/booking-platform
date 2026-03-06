import { useState, useEffect } from "react";
import {
  collection,
  doc,
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
    depositAmount: Number(data.depositAmount as number | string | undefined) || 0,
    imageUrl: (data.imageUrl as string) ?? "",
    isActive: (data.isActive as boolean) ?? true,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

export function useServices(tenantId: string | null) {
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
    // Firestore listener: must return unsubscribe for cleanup on unmount
    const q = query(
      collection(db, COLLECTION),
      where("tenantId", "==", tenantId),
      orderBy("createdAt", "desc")
    );
    const unsub: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docs.forEach((d) => {
          console.log("Raw service data:", d.id, d.data());
        });
        const list = snapshot.docs.map((d) => toService(d.id, d.data() as Record<string, unknown>));
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

export function useService(tenantId: string | null, serviceId: string | null) {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId || !serviceId) {
      setService(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const ref = doc(db, COLLECTION, serviceId);
    const unsub = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setService(null);
        } else {
          const data = snapshot.data();
          if (data.tenantId !== tenantId) {
            setService(null);
          } else {
            setService(toService(snapshot.id, data));
          }
        }
        setLoading(false);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tenantId, serviceId]);

  return { service, loading, error };
}
