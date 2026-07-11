"use client"
import { useEffect, useRef, useState } from "react"
import { Send, Paperclip, Circle } from "lucide-react"
import { useChat } from "@/hooks/useChat"
import { api } from "@/lib/api"
import type { Message } from "@cm/types"

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  token: string
  otherUser: { id: string; name: string; avatarUrl?: string }
}

export function ChatWindow({ conversationId, currentUserId, token, otherUser }: ChatWindowProps) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const { connected, messages, setMessages, sendMessage } = useChat({ conversationId, token })

  // Load history on mount
  useEffect(() => {
    api.get<{ data: Message[] }>(`/chat/conversations/${conversationId}/messages`)
      .then((res) => setMessages(res.data.data))
  }, [conversationId])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSend() {
    const text = input.trim()
    if (!text) return
    sendMessage(text)
    setInput("")
  }

  function formatTime(date: Date | string) {
    return new Date(date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
            {otherUser.name.charAt(0)}
          </div>
          <Circle
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-current ${connected ? "text-green-500" : "text-gray-300"}`}
          />
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-sm">{otherUser.name}</div>
          <div className="text-xs text-gray-400">{connected ? "ออนไลน์" : "ออฟไลน์"}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            เริ่มการสนทนาได้เลย 👋
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMine
                  ? "bg-primary-600 text-white rounded-br-md"
                  : "bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm"
              }`}>
                <p className="leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-primary-200" : "text-gray-400"} text-right`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 bg-white">
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
