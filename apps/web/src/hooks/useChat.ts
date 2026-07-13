"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import type { Message } from "@cm/types"

interface UseChatOptions {
  conversationId: string
  token: string
<<<<<<< HEAD
  onMessage?: (msg: Message) => void
}

export function useChat({ conversationId, token, onMessage }: UseChatOptions) {
  const ws = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const pingInterval = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}/api/chat/ws?token=${token}`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      setConnected(true)
      // Keep-alive ping every 25s
      pingInterval.current = setInterval(() => {
        ws.current?.send(JSON.stringify({ type: "ping" }))
      }, 25_000)
=======
  otherUserId?: string
  onMessage?: (msg: Message) => void
}

export function useChat({ conversationId, token, otherUserId, onMessage }: UseChatOptions) {
  const ws = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [otherOnline, setOtherOnline] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const pingInterval = useRef<ReturnType<typeof setInterval>>()
  const presenceInterval = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    // Derive the WS URL from the API URL so there's no separate env var to
    // forget to set — NEXT_PUBLIC_WS_URL defaulted to ws://localhost:3001
    // and was never configured for production, so chat silently never connected.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
    const wsBase = apiUrl.replace(/^http/, "ws")
    const url = `${wsBase}/chat/ws?token=${token}`
    ws.current = new WebSocket(url)

    function checkPresence() {
      if (otherUserId && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "check_presence", userId: otherUserId }))
      }
    }

    ws.current.onopen = () => {
      setConnected(true)
      checkPresence()
      // Keep-alive ping + presence re-check every 25s (no push-based presence
      // tracking server-side, so we just poll while the window is open)
      pingInterval.current = setInterval(() => {
        ws.current?.send(JSON.stringify({ type: "ping" }))
      }, 25_000)
      presenceInterval.current = setInterval(checkPresence, 15_000)
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "new_message" && data.data.conversationId === conversationId) {
        const msg = data.data as Message
        setMessages((prev) => [...prev, msg])
        onMessage?.(msg)
      }
<<<<<<< HEAD
=======
      if (data.type === "presence" && data.userId === otherUserId) {
        setOtherOnline(data.online)
      }
      if (data.type === "messages_read" && data.conversationId === conversationId) {
        setMessages((prev) => prev.map(m => ({ ...m, readAt: m.readAt ?? new Date().toISOString() as any })))
      }
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
    }

    ws.current.onclose = () => {
      setConnected(false)
<<<<<<< HEAD
      clearInterval(pingInterval.current)
=======
      setOtherOnline(false)
      clearInterval(pingInterval.current)
      clearInterval(presenceInterval.current)
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
    }

    return () => {
      ws.current?.close()
      clearInterval(pingInterval.current)
<<<<<<< HEAD
    }
  }, [conversationId, token])
=======
      clearInterval(presenceInterval.current)
    }
  }, [conversationId, token, otherUserId])
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c

  const sendMessage = useCallback((content: string, type: "text" | "image" | "order_ref" = "text") => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "send_message", conversationId, content, messageType: type }))
    }
  }, [conversationId])

<<<<<<< HEAD
  return { connected, messages, setMessages, sendMessage }
=======
  const markRead = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "mark_read", conversationId }))
    }
  }, [conversationId])

  return { connected, otherOnline, messages, setMessages, sendMessage, markRead }
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
}
