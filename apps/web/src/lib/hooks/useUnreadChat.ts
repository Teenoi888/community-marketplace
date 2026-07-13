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

    // ChatWindow marks messages read over its own separate WS connection —
    // the server only notifies the *other* person's socket when that
    // happens, not any of the reader's own other connections (like this
    // one), so this badge would otherwise only catch up on the next 20s
    // poll. ChatWindow fires this event in the same tab right after marking
    // read, so the badge clears immediately instead.
    window.addEventListener("chat:read", refreshUnreadCount)

    const token = localStorage.getItem("access_token")
    let refreshInterval: ReturnType<typeof setInterval> | undefined

    if (token) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
      const url = `${apiUrl.replace(/^http/, "ws")}/chat/ws?token=${token}`
      ws.current = new WebSocket(url)

      // Periodic refetch as a safety net — e.g. after reading a conversation
      // in another tab, which this hook has no direct signal for.
      refreshInterval = setInterval(refreshUnreadCount, 20_000)

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
    }

    return () => {
      window.removeEventListener("chat:read", refreshUnreadCount)
      ws.current?.close()
      clearInterval(pingInterval.current)
      clearInterval(refreshInterval)
    }
  }, [user, refreshUnreadCount])

  return { unreadCount, refreshUnreadCount }
}
