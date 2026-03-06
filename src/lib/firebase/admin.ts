import {
  getApps,
  getApp,
  initializeApp,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let adminApp: App | null = null;

function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApp() as App;
    return adminApp;
  }
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (privateKey && projectId && clientEmail) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: storageBucket ?? undefined,
    });
    return adminApp;
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as { project_id?: string; client_email?: string; private_key?: string };
      const serviceAccount = {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: storageBucket ?? parsed.project_id ? `${parsed.project_id}.appspot.com` : undefined,
      });
      return adminApp;
    } catch {
      //
    }
  }
  adminApp = initializeApp({
    credential: applicationDefault(),
    storageBucket: storageBucket ?? undefined,
  });
  return adminApp;
}

let _adminDb: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (!_adminDb) {
    _adminDb = getFirestore(getFirebaseAdminApp());
  }
  return _adminDb;
}

export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    return (getAdminDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_, prop) {
    return (getAuth(getFirebaseAdminApp()) as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminStorage = new Proxy({} as ReturnType<typeof getStorage>, {
  get(_, prop) {
    return (getStorage(getFirebaseAdminApp()) as unknown as Record<string | symbol, unknown>)[prop];
  },
});
