"use client"
<<<<<<< HEAD
import { useState } from "react"
=======
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
import { MainNav } from "@/components/layout/MainNav"
import { ConversationList } from "@/components/chat/ConversationList"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { useAuthStore } from "@/lib/store/auth"
<<<<<<< HEAD
import { MessageSquare } from "lucide-react"

export default function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const [activeConv, setActiveConv] = useState<{ id: string; other: { id: string; name: string } } | null>(null)
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : ""

=======
import { api } from "@/lib/api"
import { MessageSquare, ArrowLeft } from "lucide-react"

interface Conversation {
  id: string
  otherUser: { id: string; name: string; avatarUrl?: string }
}

function ChatPageInner() {
  const user = useAuthStore((s) => s.user)
  const searchParams = useSearchParams()
  const deepLinkId = searchParams.get("c")
  const [activeConv, setActiveConv] = useState<{ id: string; other: { id: string; name: string } } | null>(null)
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : ""

  // Shares the same query cache/key as ConversationList
  const { data: convs } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get<{ data: Conversation[] }>("/chat/conversations")
      return res.data.data
    },
    refetchInterval: 10_000,
  })

  // Auto-select the conversation from a "แชท" button deep link (?c=conversationId)
  useEffect(() => {
    if (!deepLinkId || !convs || activeConv) return
    const match = convs.find(c => c.id === deepLinkId)
    if (match) setActiveConv({ id: match.id, other: match.otherUser })
  }, [deepLinkId, convs, activeConv])

>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
  return (
    <main className="h-screen flex flex-col">
      <MainNav />
      <div className="flex flex-1 overflow-hidden">
<<<<<<< HEAD
        {/* Sidebar */}
        <aside className="w-72 border-r border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
=======
        {/* Sidebar — full width on mobile until a conversation is picked, fixed width on sm+ */}
        <aside className={`${activeConv ? "hidden" : "flex"} sm:flex w-full sm:w-72 border-r border-gray-200 bg-white flex-col overflow-hidden flex-shrink-0`}>
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              ข้อความ
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              activeId={activeConv?.id}
              onSelect={(id, other) => setActiveConv({ id, other })}
            />
          </div>
        </aside>

<<<<<<< HEAD
        {/* Chat window */}
        <div className="flex-1 overflow-hidden p-4 bg-gray-50">
          {activeConv && user ? (
            <ChatWindow
              conversationId={activeConv.id}
              currentUserId={user.id}
              token={token}
              otherUser={activeConv.other}
            />
=======
        {/* Chat window — hidden on mobile until a conversation is picked */}
        <div className={`${activeConv ? "flex" : "hidden"} sm:flex flex-1 flex-col overflow-hidden sm:p-4 bg-gray-50`}>
          {activeConv && user ? (
            <>
              {/* Back to list — mobile only */}
              <button
                onClick={() => setActiveConv(null)}
                className="sm:hidden flex items-center gap-2 px-4 py-3 text-sm text-gray-600 bg-white border-b border-gray-100 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" /> กลับไปที่รายการ
              </button>
              <div className="flex-1 overflow-hidden">
                <ChatWindow
                  conversationId={activeConv.id}
                  currentUserId={user.id}
                  token={token}
                  otherUser={activeConv.other}
                />
              </div>
            </>
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400">เลือกการสนทนาจากรายการด้านซ้าย</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
<<<<<<< HEAD
=======

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-400">กำลังโหลด...</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
