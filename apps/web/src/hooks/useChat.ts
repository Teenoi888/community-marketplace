"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import type { Message } from "@cm/types"

interface UseChatOptions {
  conversationId: string
  token: string
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
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "new_message" && data.data.conversationId === conversationId) {
        const msg = data.data as Message
        setMessages((prev) => [...prev, msg])
        onMessage?.(msg)
      }
    }

    ws.current.onclose = () => {
      setConnected(false)
      clearInterval(pingInterval.current)
    }

    return () => {
      ws.current?.close()
      clearInterval(pingInterval.current)
    }
  }, [conversationId, token])

  const sendMessage = useCallback((content: string, type: "text" | "image" | "order_ref" = "text") => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "send_message", conversationId, content, messageType: type }))
    }
  }, [conversationId])

  return { connected, messages, setMessages, sendMessage }
}
