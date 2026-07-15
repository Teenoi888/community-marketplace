import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  const username = process.env.TURN_USERNAME
  const credential = process.env.TURN_CREDENTIAL

  if (username && credential) {
    return NextResponse.json({
      iceServers: [
        { urls: "stun:stun.relay.metered.ca:80" },
        { urls: "turn:global.relay.metered.ca:80", username, credential },
        { urls: "turn:global.relay.metered.ca:80?transport=tcp", username, credential },
        { urls: "turn:global.relay.metered.ca:443", username, credential },
        { urls: "turns:global.relay.metered.ca:443?transport=tcp", username, credential },
      ]
    })
  }

  // fallback STUN only
  return NextResponse.json({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ]
  })
}
