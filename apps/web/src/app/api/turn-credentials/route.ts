import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.METERED_API_KEY
  const domain = process.env.METERED_DOMAIN || "chumchon.metered.live"
  const fallback = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ]
  }

  if (!apiKey) {
    console.warn("[turn-credentials] METERED_API_KEY not set — returning STUN fallback")
    return NextResponse.json(fallback)
  }

  try {
    const url = `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`
    console.log(`[turn-credentials] fetching: https://${domain}/api/v1/turn/credentials`)
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      console.error(`[turn-credentials] Metered API returned ${res.status} — returning fallback`)
      return NextResponse.json(fallback)
    }
    const iceServers = await res.json()
    console.log(`[turn-credentials] got ${iceServers.length} ICE servers`)
    return NextResponse.json({ iceServers })
  } catch (err) {
    console.error("[turn-credentials] fetch error:", err)
    return NextResponse.json(fallback)
  }
}
