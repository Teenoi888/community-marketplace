"use client"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"

interface Conversation {
  id: string
  otherUser: { id: string; name: string; avatarUrl?: string }
  lastMessage?: { content: string; createdAt: string }
  updatedAt: string
}

interface Props {
  activeId?: string
  onSelect: (id: string, other: Conversation["otherUser"]) => void
}

export function ConversationList({ activeId, onSelect }: Props) {
  const { data: convs, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get<{ data: Conversation[] }>("/chat/conversations")
      return res.data.data
    },
    refetchInterval: 10_000,
  })

  if (isLoading) return (
    <div className="space-y-2 p-3">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!convs?.length) return (
    <div className="text-center text-gray-400 text-sm py-10 px-4">
      ยังไม่มีการสนทนา
    </div>
  )

  return (
    <div className="divide-y divide-gray-50">
      {convs.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id, c.otherUser)}
          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
            activeId === c.id ? "bg-primary-50" : ""
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
            {c.otherUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-gray-900 truncate">{c.otherUser.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                {formatDistanceToNow(new Date(c.updatedAt), { locale: th, addSuffix: true })}
              </span>
            </div>
            {c.lastMessage && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{c.lastMessage.content}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
