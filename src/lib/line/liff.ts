import liff from "@line/liff";

/** LIFF ID ของ JongMe — ต้องตรงกับ LINE Developers (Channel เดียวกับ Messaging API) */
export const JONGME_LIFF_ID =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_LIFF_ID) ||
  "2009324540-weVbZ1eR";

/**
 * ลิงก์เปิด LIFF แบบทางการ — ให้ LINE จัดการล็อกอินเอง
 * ใช้แทน liff.login() บนหน้าเว็บธรรมดาเพื่อลด 400 Bad Request จาก OAuth redirect_uri
 */
export function getLiffUniversalLink(): string {
  return `https://liff.line.me/${JONGME_LIFF_ID}`;
}

/** fallback เมื่อไม่มี window (SSR) — ต้องตรงกับ LIFF Endpoint + LINE Login callback */
const APP_ORIGIN_FALLBACK =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) ||
  "https://jongme.com";

/**
 * redirect_uri ต้องตรงกับ LIFF Endpoint URL และ Callback URL ใน LINE Login (ทุกตัวอักษร)
 * ใช้ origin ของหน้าที่ผู้ใช้เปิดจริง (www vs non-www) เพื่อลด 400 Bad Request
 */
export function getLiffLoginRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/$/, "")}/start`;
  }
  return `${APP_ORIGIN_FALLBACK.replace(/\/$/, "")}/start`;
}

let initDone = false;

export async function initializeLiff(liffId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (initDone) return;
  await liff.init({ liffId });
  initDone = true;
}

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl: string;
}

export async function getLiffProfile(): Promise<LiffProfile | null> {
  if (typeof window === "undefined") return null;
  if (!liff.isLoggedIn()) return null;
  const profile = await liff.getProfile();
  return {
    userId: profile.userId,
    displayName: profile.displayName ?? "",
    pictureUrl: profile.pictureUrl ?? "",
  };
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return liff.isLoggedIn();
}

export function login(): void {
  if (typeof window === "undefined") return;
  liff.login();
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return liff.getAccessToken();
}
