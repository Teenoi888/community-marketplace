"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"

export function useUnreadChat() {
  const user = useAuthStore((s) => s.user)
  const [unreadCount, setUnreadCount] = useState(0)
  const ws = useRef<WebSocket | null>(null)
  const pingInterval = useRef<ReturnType<typeof setInterval>>()

  const refreshUnreadCount = useCallback(() => {
    if (!user) return
    api.get("/chat/unread-count")
      .then((r) => setUnreadCount(r.data.data.count))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    refreshUnreadCount()

    const token = localStorage.getItem("access_token")
    if (!token) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
    const url = `${apiUrl.replace(/^http/, "ws")}/chat/ws?token=${token}`
    ws.current = new WebSocket(url)

    // Periodic refetch as a safety net — e.g. after reading a conversation
    // in another tab, which this hook has no direct signal for.
    const refreshInterval = setInterval(refreshUnreadCount, 20_000)

    ws.current.onopen = () => {
      pingInterval.current = setInterval(() => {
        ws.current?.send(JSON.stringify({ type: "ping" }))
      }, 25_000)
    }

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      // The server echoes send_message back to the sender too, so only
      // count it as unread when someone else sent it to us.
      if (msg.type === "new_message" && msg.data.senderId !== user.id) {
        setUnreadCount((c) => c + 1)
      }
    }

    ws.current.onclose = () => clearInterval(pingInterval.current)

    return () => {
      ws.current?.close()
      clearInterval(pingInterval.current)
      clearInterval(refreshInterval)
    }
  }, [user, refreshUnreadCount])

  return { unreadCount, refreshUnreadCount }
}
