"use client"
import { useEffect, useRef, useState } from "react"
<<<<<<< HEAD
import { Send, Paperclip, Circle } from "lucide-react"
=======
import Image from "next/image"
import { Send, Paperclip, Circle, Check, CheckCheck } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
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
<<<<<<< HEAD
  const bottomRef = useRef<HTMLDivElement>(null)
  const { connected, messages, setMessages, sendMessage } = useChat({ conversationId, token })
=======
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { otherOnline, messages, setMessages, sendMessage, markRead } = useChat({
    conversationId,
    token,
    otherUserId: otherUser.id,
  })
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c

  // Load history on mount
  useEffect(() => {
    api.get<{ data: Message[] }>(`/chat/conversations/${conversationId}/messages`)
      .then((res) => setMessages(res.data.data))
  }, [conversationId])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

<<<<<<< HEAD
=======
  // The window being open/focused counts as "read" — mark on open and every
  // time a new message arrives while it's still the active conversation.
  // Also invalidate the sidebar's conversation list so its unread badge for
  // this conversation clears immediately instead of waiting for its
  // 10s poll.
  useEffect(() => {
    if (messages.some(m => m.senderId !== currentUserId && !m.readAt)) {
      markRead()
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    }
  }, [conversationId, messages, currentUserId, markRead, queryClient])

>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
  function handleSend() {
    const text = input.trim()
    if (!text) return
    sendMessage(text)
    setInput("")
  }

<<<<<<< HEAD
=======
  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "chat")
      const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } })
      sendMessage(res.data.data.url, "image")
    } catch {
      toast.error("ส่งรูปไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setUploading(false)
    }
  }

>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
  function formatTime(date: Date | string) {
    return new Date(date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
  }

  return (
<<<<<<< HEAD
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-gray-200">
=======
    <div className="flex flex-col h-full bg-white overflow-hidden sm:rounded-xl sm:border sm:border-gray-200">
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
            {otherUser.name.charAt(0)}
          </div>
          <Circle
<<<<<<< HEAD
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-current ${connected ? "text-green-500" : "text-gray-300"}`}
=======
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-current ${otherOnline ? "text-green-500" : "text-gray-300"}`}
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
          />
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-sm">{otherUser.name}</div>
<<<<<<< HEAD
          <div className="text-xs text-gray-400">{connected ? "ออนไลน์" : "ออฟไลน์"}</div>
=======
          <div className="text-xs text-gray-400">{otherOnline ? "ออนไลน์" : "ออฟไลน์"}</div>
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            เริ่มการสนทนาได้เลย 👋
          </div>
        )}
<<<<<<< HEAD
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
=======
        {(() => {
          const lastMineIndex = messages.reduce(
            (acc, m, i) => (m.senderId === currentUserId ? i : acc), -1
          )
          return messages.map((msg, i) => {
            const isMine = msg.senderId === currentUserId
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? "bg-primary-600 text-white rounded-br-md"
                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm"
                }`}>
                  {msg.type === "image" ? (
                    <a href={msg.content} target="_blank" rel="noopener noreferrer">
                      <Image src={msg.content} alt="" width={200} height={200} className="rounded-lg object-cover" />
                    </a>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end text-primary-200" : "justify-end text-gray-400"}`}>
                    <p className="text-[10px]">{formatTime(msg.createdAt)}</p>
                    {isMine && i === lastMineIndex && (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        {msg.readAt
                          ? <><CheckCheck className="w-3.5 h-3.5" /> อ่านแล้ว</>
                          : <Check className="w-3.5 h-3.5" />
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        })()}
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 bg-white">
<<<<<<< HEAD
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
=======
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAttach}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
        >
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
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
