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
    const tenant = tenantDoc.data() as { lineChannelAccessToken?: string } | undefined;
    const channelAccessToken = tenant?.lineChannelAccessToken;
    if (!channelAccessToken) return null;

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

    const { createCanvas } = require("canvas") as typeof import("canvas");
    const canvas = createCanvas(2500, 843);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0D9488";
    ctx.fillRect(0, 0, 2500, 843);

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(833, 100);
    ctx.lineTo(833, 743);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1667, 100);
    ctx.lineTo(1667, 743);
    ctx.stroke();

    const drawCircleIcon = (cx: number, cy: number, iconText: string) => {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.arc(cx, cy - 60, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 80px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(iconText, cx, cy - 55);
    };

    drawCircleIcon(416, 380, "+");
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 65px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("จองคิว", 416, 480);

    drawCircleIcon(1250, 380, "=");
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 55px Arial, sans-serif";
    ctx.fillText("เช็คการจอง", 1250, 480);

    drawCircleIcon(2083, 380, "?");
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 60px Arial, sans-serif";
    ctx.fillText("ติดต่อเรา", 2083, 480);

    const imageBuffer = canvas.toBuffer("image/png");

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

