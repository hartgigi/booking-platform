import { adminDb } from "@/lib/firebase/admin";
const sharp = require("sharp");

const RICH_MENU_TEMPLATE = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: "Main Menu",
  chatBarText: "เมนู",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: { type: "uri", label: "จองคิว", uri: "" },
    },
    {
      bounds: { x: 833, y: 0, width: 834, height: 843 },
      action: { type: "postback", label: "เช็คการจอง", data: "action=check_booking", displayText: "เช็คการจอง" },
    },
    {
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: { type: "uri", label: "ติดต่อเรา", uri: "" },
    },
  ],
};

export async function createRichMenuForTenant(
  tenantId: string
): Promise<string | null> {
  try {
    const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
    if (!tenantDoc.exists) return null;
    const tenant = tenantDoc.data() as { lineChannelAccessToken?: string; richMenuId?: string } | undefined;
    const channelAccessToken = tenant?.lineChannelAccessToken;
    if (!channelAccessToken) return null;

    const oldRichMenuId = tenant?.richMenuId;
    if (oldRichMenuId) {
      try {
        await fetch("https://api.line.me/v2/bot/richmenu/" + oldRichMenuId, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + channelAccessToken },
        });
        console.log("Deleted old rich menu:", oldRichMenuId);
      } catch (e) {
        console.log("Failed to delete old rich menu");
      }
    }

    try {
      await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + channelAccessToken },
      });
      console.log("Unlinked default rich menu");
    } catch (e) {
      console.log("Failed to unlink default rich menu");
    }

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
    const liffUrl = "https://liff.line.me/" + liffId + "?tenantId=" + tenantId;

    const menuBody = JSON.parse(JSON.stringify(RICH_MENU_TEMPLATE)) as typeof RICH_MENU_TEMPLATE;
    (menuBody.areas[0].action as { uri: string }).uri = liffUrl;
    (menuBody.areas[2].action as { uri: string }).uri = liffUrl + "&page=contact";

    const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + channelAccessToken,
      },
      body: JSON.stringify(menuBody),
    });
    const createData = (await createRes.json()) as { richMenuId?: string };
    const richMenuId = createData.richMenuId;
    if (!richMenuId) {
      console.error("Failed to create rich menu:", createData);
      return null;
    }

    const svgContent = `<svg width="2500" height="843" xmlns="http://www.w3.org/2000/svg">
  <rect width="2500" height="843" fill="#0D9488"/>
  <line x1="833" y1="60" x2="833" y2="783" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>
  <line x1="1667" y1="60" x2="1667" y2="783" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>
  <circle cx="416" cy="320" r="120" fill="rgba(255,255,255,0.2)"/>
  <text x="416" y="295" font-family="Arial" font-size="130" text-anchor="middle" fill="white">📅</text>
  <text x="416" y="560" font-family="Arial, Helvetica" font-size="90" font-weight="bold" text-anchor="middle" fill="white">&#3592;&#3629;&#3591;&#3588;&#3636;&#3623;</text>
  <circle cx="1250" cy="320" r="120" fill="rgba(255,255,255,0.2)"/>
  <text x="1250" y="295" font-family="Arial" font-size="130" text-anchor="middle" fill="white">📋</text>
  <text x="1250" y="530" font-family="Arial, Helvetica" font-size="75" font-weight="bold" text-anchor="middle" fill="white">&#3648;&#3594;&#3655;&#3588;&#3585;&#3634;&#3619;&#3592;&#3629;&#3591;</text>
  <circle cx="2083" cy="320" r="120" fill="rgba(255,255,255,0.2)"/>
  <text x="2083" y="295" font-family="Arial" font-size="130" text-anchor="middle" fill="white">📞</text>
  <text x="2083" y="560" font-family="Arial, Helvetica" font-size="80" font-weight="bold" text-anchor="middle" fill="white">&#3605;&#3636;&#3604;&#3605;&#3656;&#3629;&#3648;&#3619;&#3634;</text>
</svg>`;

    const imageBuffer = await sharp(Buffer.from(svgContent)).png().toBuffer();

    const uploadRes = await fetch(
      "https://api-data.line.me/v2/bot/richmenu/" + richMenuId + "/content",
      {
        method: "POST",
        headers: {
          "Content-Type": "image/png",
          Authorization: "Bearer " + channelAccessToken,
        },
        body: imageBuffer as any,
      }
    );

    if (!uploadRes.ok) {
      console.error("Failed to upload rich menu image:", await uploadRes.text());
      return null;
    }

    const setDefaultRes = await fetch(
      "https://api.line.me/v2/bot/user/all/richmenu/" + richMenuId,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + channelAccessToken,
        },
      }
    );

    if (!setDefaultRes.ok) {
      console.error(
        "Failed to set default rich menu:",
        await setDefaultRes.text()
      );
    }

    await adminDb.collection("tenants").doc(tenantId).update({
      richMenuId,
    });

    return richMenuId;
  } catch (error) {
    console.error("Rich menu creation error:", error);
    return null;
  }
}

