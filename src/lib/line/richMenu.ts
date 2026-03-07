import { adminDb } from "@/lib/firebase/admin";

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

    const fs = require("fs");
    const path = require("path");
    const imageBuffer = fs.readFileSync(path.join(process.cwd(), "public", "rich_menu.png"));

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

