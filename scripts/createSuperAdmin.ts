import "./loadEnv";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  getApps,
  getApp,
  initializeApp,
  cert,
  applicationDefault,
} from "firebase-admin/app";

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  if (privateKey && projectId && clientEmail) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      const serviceAccount = {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch {
      //
    }
  }
  return initializeApp({
    credential: applicationDefault(),
  });
}

const app = getFirebaseAdminApp();
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

const SUPER_ADMIN_EMAIL = "superadmin@jongme.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin1234!";

async function main() {
  const user = await adminAuth.createUser({
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD,
    emailVerified: true,
  });
  console.log("Created Firebase Auth user:", user.uid);

  const now = Timestamp.now();
  await adminDb.collection("users").doc(user.uid).set({
    email: SUPER_ADMIN_EMAIL,
    isSuperAdmin: true,
    createdAt: now,
  });
  console.log("Created Firestore users document with isSuperAdmin: true");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
