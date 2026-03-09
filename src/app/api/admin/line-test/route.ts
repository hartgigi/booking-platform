import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    let token: string | null = null;

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else {
      const { searchParams } = new URL(request.url);
      const qToken = searchParams.get("token");
      if (qToken) token = qToken;
    }

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Missing token" },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          message:
            text || `LINE API error: ${res.status} ${res.statusText}`,
        },
        { status: 400 }
      );
    }

    const data = (await res.json().catch(() => ({}))) as {
      displayName?: string;
    };

    return NextResponse.json({
      ok: true,
      botName: data.displayName ?? "",
    });
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Unknown error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}

