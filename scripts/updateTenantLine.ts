import "./loadEnv";
import { getFirestore } from "firebase-admin/firestore";
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
const adminDb = getFirestore(app);

const TENANT_ID = "Nu89K2Wc3mO5r7bLEbOl";

async function main() {
  console.log("Correct tenantId:", TENANT_ID);
  const lineChannelAccessToken =
    process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  const lineChannelSecret = process.env.LINE_CHANNEL_SECRET ?? "";
  await adminDb.collection("tenants").doc(TENANT_ID).update({
    lineChannelAccessToken,
    lineChannelSecret,
    adminLineUserId: "",
  });
  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
