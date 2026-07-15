import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.METERED_API_KEY
  const domain = process.env.METERED_DOMAIN || "chumchon.metered.live"
  const fallback = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ]
  }

  if (!apiKey) return NextResponse.json(fallback)

  try {
    const res = await fetch(
      `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return NextResponse.json(fallback)
    const iceServers = await res.json()
    return NextResponse.json({ iceServers })
  } catch {
    return NextResponse.json(fallback)
  }
}
