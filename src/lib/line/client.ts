import { Client, validateSignature } from "@line/bot-sdk";
import type { FlexContainer } from "@line/bot-sdk";
import type { TemplateConfirm } from "@line/bot-sdk";
import { adminDb } from "@/lib/firebase/admin";
import type { Tenant } from "@/types";

const clientCache = new Map<string, Client>();

export function validateLineSignature(
  body: string,
  channelSecret: string,
  signature: string
): boolean {
  return validateSignature(body, channelSecret, signature);
}

export async function getLineClient(tenantId: string): Promise<Client> {
  const cached = clientCache.get(tenantId);
  if (cached) return cached;
  const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
  if (!tenantDoc.exists) {
    throw new Error(`Tenant ${tenantId} not found`);
  }
  const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
  const token = tenant.lineChannelAccessToken ?? "";
  const client = new Client({
    channelAccessToken: token,
  });
  clientCache.set(tenantId, client);
  return client;
}

export async function sendTextMessage(
  tenantId: string,
  lineUserId: string,
  message: string
): Promise<void> {
  const client = await getLineClient(tenantId);
  await client.pushMessage(lineUserId, { type: "text", text: message });
}

export async function sendFlexMessage(
  tenantId: string,
  lineUserId: string,
  altText: string,
  flexContent: FlexContainer
): Promise<void> {
  const client = await getLineClient(tenantId);
  try {
    await client.pushMessage(lineUserId, {
      type: "flex",
      altText,
      contents: flexContent,
    });
  } catch (e) {
    console.error("sendFlexMessage error:", e);
    throw e;
  }
}

export async function sendConfirmTemplate(
  tenantId: string,
  lineUserId: string,
  altText: string,
  confirmContent: TemplateConfirm
): Promise<void> {
  const client = await getLineClient(tenantId);
  await client.pushMessage(lineUserId, {
    type: "template",
    altText,
    template: confirmContent,
  });
}

export async function replyText(
  tenantId: string,
  replyToken: string,
  message: string
): Promise<void> {
  const client = await getLineClient(tenantId);
  try {
    await client.replyMessage(replyToken, { type: "text", text: message });
  } catch (e) {
    console.error("replyText error:", e);
    throw e;
  }
}

export async function replyFlex(
  tenantId: string,
  replyToken: string,
  altText: string,
  flexContent: FlexContainer
): Promise<void> {
  const client = await getLineClient(tenantId);
  try {
    await client.replyMessage(replyToken, {
      type: "flex",
      altText,
      contents: flexContent,
    });
  } catch (e) {
    console.error("replyFlex error:", e);
    throw e;
  }
}

export async function replyConfirmTemplate(
  tenantId: string,
  replyToken: string,
  altText: string,
  confirmContent: TemplateConfirm
): Promise<void> {
  const client = await getLineClient(tenantId);
  await client.replyMessage(replyToken, {
    type: "template",
    altText,
    template: confirmContent,
  });
}
