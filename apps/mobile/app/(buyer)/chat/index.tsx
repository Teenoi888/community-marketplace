import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../../lib/api"
import { useAuthStore } from "../../../lib/store/auth"
import * as SecureStore from "expo-secure-store"

interface Message {
  id: string
  senderId: string
  content: string
  type: string
  createdAt: string
}

interface Conversation {
  id: string
  otherUser: { id: string; name: string }
  lastMessage?: { content: string }
  updatedAt: string
}

// Sub-component: individual chat view
function ChatView({ conversation, currentUserId, token }: {
  conversation: Conversation
  currentUserId: string
  token: string
}) {
  const [input, setInput] = useState("")
  const [msgs, setMsgs] = useState<Message[]>([])
  const ws = useRef<WebSocket | null>(null)
  const listRef = useRef<FlatList>(null)
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api"
  const wsUrl = apiUrl.replace("http", "ws").replace("/api", "")

  useEffect(() => {
    api.get(`/chat/conversations/${conversation.id}/messages`)
      .then(r => setMsgs(r.data.data))

    ws.current = new WebSocket(`${wsUrl}/api/chat/ws?token=${token}`)
    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === "new_message" && data.data.conversationId === conversation.id) {
        setMsgs(prev => [...prev, data.data])
      }
    }
    return () => ws.current?.close()
  }, [conversation.id])

  function send() {
    if (!input.trim()) return
    ws.current?.send(JSON.stringify({
      type: "send_message",
      conversationId: conversation.id,
      content: input.trim(),
      messageType: "text",
    }))
    setInput("")
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Text className="font-bold text-gray-900">{conversation.otherUser.name}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(item) => item.id}
        className="flex-1 bg-gray-50 px-4 py-2"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMine = item.senderId === currentUserId
          return (
            <View className={`flex-row mb-2 ${isMine ? "justify-end" : "justify-start"}`}>
              <View className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                isMine ? "bg-primary-600 rounded-br-md" : "bg-white border border-gray-200 rounded-bl-md"
              }`}>
                <Text className={isMine ? "text-white" : "text-gray-800"}>{item.content}</Text>
                <Text className={`text-[10px] mt-1 text-right ${isMine ? "text-primary-200" : "text-gray-400"}`}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={() => (
          <View className="items-center py-10">
            <Text className="text-gray-400 text-sm">เริ่มการสนทนาได้เลย 👋</Text>
          </View>
        )}
      />

      {/* Input */}
      <View className="flex-row items-center gap-2 px-4 py-3 bg-white border-t border-gray-100">
        <TextInput
          className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm"
          placeholder="พิมพ์ข้อความ..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={send}
          disabled={!input.trim()}
          className={`w-10 h-10 rounded-full items-center justify-center ${input.trim() ? "bg-primary-600" : "bg-gray-200"}`}
        >
          <Text className={input.trim() ? "text-white" : "text-gray-400"}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// Main screen: conversation list
export default function ChatScreen() {
  const user = useAuthStore((s) => s.user)
  const [token, setToken] = useState("")
  const [selected, setSelected] = useState<Conversation | null>(null)

  useEffect(() => {
    SecureStore.getItemAsync("access_token").then((t) => setToken(t || ""))
  }, [])

  const { data: convs, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await api.get("/chat/conversations")
      return data.data as Conversation[]
    },
    refetchInterval: 10_000,
  })

  if (selected && user) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <TouchableOpacity onPress={() => setSelected(null)} className="flex-row items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Text className="text-primary-600">← กลับ</Text>
        </TouchableOpacity>
        <ChatView conversation={selected} currentUserId={user.id} token={token} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">💬 ข้อความ</Text>
      </View>

      <FlatList
        data={convs}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelected(item)}
            className="flex-row items-center gap-3 px-4 py-4 border-b border-gray-50 active:bg-gray-50"
          >
            <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center">
              <Text className="text-primary-700 font-bold text-lg">{item.otherUser.name.charAt(0)}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">{item.otherUser.name}</Text>
              {item.lastMessage && (
                <Text className="text-sm text-gray-400 mt-0.5" numberOfLines={1}>{item.lastMessage.content}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-20">
            <Text className="text-5xl mb-3">💬</Text>
            <Text className="text-gray-400">ยังไม่มีข้อความ</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
