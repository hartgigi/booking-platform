import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const WEBHOOK_LIMIT = 100
const WEBHOOK_WINDOW_MS = 60 * 1000
const BOOKING_CREATE_LIMIT = 10
const BOOKING_CREATE_WINDOW_MS = 60 * 1000

const webhookCounts = new Map<string, { count: number; resetAt: number }>()
const bookingCounts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown"
  return request.headers.get("x-real-ip") ?? "unknown"
}

function checkRateLimit(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const entry = map.get(key)
  if (!entry) {
    map.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  if (pathname.startsWith("/api/webhook/line/")) {
    const ip = getClientIp(request)
    const allowed = checkRateLimit(webhookCounts, ip, WEBHOOK_LIMIT, WEBHOOK_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
    }
  }

  const isBookingCreate =
    method === "POST" &&
    /^\/api\/customer\/[^/]+\/bookings$/.test(pathname)
  if (isBookingCreate) {
    const ip = getClientIp(request)
    const allowed = checkRateLimit(bookingCounts, ip, BOOKING_CREATE_LIMIT, BOOKING_CREATE_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*", "/booking/:path*"],
}
