import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Service } from "@/types";

const COLLECTION = "services";

function toService(id: string, data: DocumentData): Service {
  return {
    id,
    tenantId: data.tenantId,
    name: data.name,
    description: data.description ?? "",
    durationMinutes: data.durationMinutes,
    price: data.price,
    depositAmount: Number(data.depositAmount) || 0,
    imageUrl: data.imageUrl ?? "",
    isActive: data.isActive ?? true,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

export async function getServices(tenantId: string): Promise<Service[]> {
  const q = query(
    collection(db, COLLECTION),
    where("tenantId", "==", tenantId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toService(d.id, d.data()));
}

export async function getService(
  tenantId: string,
  serviceId: string
): Promise<Service | null> {
  const ref = doc(db, COLLECTION, serviceId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.tenantId !== tenantId) return null;
  return toService(snapshot.id, data);
}

export type CreateServiceData = Omit<
  Service,
  "id" | "tenantId" | "createdAt" | "updatedAt"
>;

export async function createService(
  tenantId: string,
  data: CreateServiceData
): Promise<string> {
  const payload = {
    tenantId,
    name: data.name,
    description: data.description ?? "",
    durationMinutes: data.durationMinutes,
    price: data.price,
    depositAmount: data.depositAmount ?? 0,
    imageUrl: data.imageUrl ?? "",
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  console.log("createService payload", payload);
  const ref = await addDoc(collection(db, COLLECTION), payload);
  return ref.id;
}

export type UpdateServiceData = Partial<
  Omit<Service, "id" | "tenantId" | "createdAt" | "updatedAt">
>;

export async function updateService(
  tenantId: string,
  serviceId: string,
  data: UpdateServiceData
): Promise<void> {
  const ref = doc(db, COLLECTION, serviceId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().tenantId !== tenantId) {
    throw new Error("Service not found");
  }
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  console.log("updateService payload", serviceId, payload);
  await updateDoc(ref, payload);
}

export async function deleteService(
  tenantId: string,
  serviceId: string
): Promise<void> {
  const ref = doc(db, COLLECTION, serviceId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().tenantId !== tenantId) {
    throw new Error("Service not found");
  }
  await deleteDoc(ref);
}

export async function toggleServiceStatus(
  tenantId: string,
  serviceId: string
): Promise<void> {
  const ref = doc(db, COLLECTION, serviceId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().tenantId !== tenantId) {
    throw new Error("Service not found");
  }
  const current = snapshot.data().isActive ?? true;
  await updateDoc(ref, {
    isActive: !current,
    updatedAt: serverTimestamp(),
  });
}
