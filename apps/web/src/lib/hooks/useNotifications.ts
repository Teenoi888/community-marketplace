"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/lib/store/auth"

export function useNotifications() {
  const user = useAuthStore((s) => s.user)
  const [unreadCount, setUnreadCount] = useState(0)
  const ws = useRef<WebSocket | null>(null)
  const pingInterval = useRef<ReturnType<typeof setInterval>>()

  const refreshUnreadCount = useCallback(() => {
    if (!user) return
    api.get("/notifications/unread-count")
      .then((r) => setUnreadCount(r.data.data))
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

    // Same fix as useChat: derive from NEXT_PUBLIC_API_URL rather than a
    // separate NEXT_PUBLIC_WS_URL that was never set for production.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
    const url = `${apiUrl.replace(/^http/, "ws")}/chat/ws?token=${token}`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      pingInterval.current = setInterval(() => {
        ws.current?.send(JSON.stringify({ type: "ping" }))
      }, 25_000)
    }

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === "notification") {
        setUnreadCount((c) => c + 1)
      }
    }

    ws.current.onclose = () => clearInterval(pingInterval.current)

    return () => {
      ws.current?.close()
      clearInterval(pingInterval.current)
    }
  }, [user, refreshUnreadCount])

  return { unreadCount, refreshUnreadCount }
}
