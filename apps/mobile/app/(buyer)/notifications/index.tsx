import { View, Text, FlatList, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface Notification {
  id: string; type: string; title: string; body: string
  link: string | null; isRead: boolean; createdAt: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "เมื่อกี้"
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/notifications").then(r => setNotifications(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  async function markRead(n: Notification) {
    if (!n.isRead) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x))
      api.patch(`/notifications/${n.id}/read`).catch(() => {})
    }
    if (n.link) {
      // web links (e.g. "/orders/xxx") — map the common ones to mobile routes
      if (n.link.startsWith("/orders/")) router.push(`/(buyer)/order/${n.link.split("/").pop()}`)
      else if (n.link === "/orders") router.push("/(buyer)/orders")
    }
  }

  async function markAllRead() {
    if (!notifications.some(n => !n.isRead)) return
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    api.patch("/notifications/read-all").catch(() => {})
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">🔔 การแจ้งเตือน{unreadCount > 0 ? ` (${unreadCount})` : ""}</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}><Text className="text-primary-600 text-sm font-medium">อ่านทั้งหมด</Text></TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-6 gap-2"
        refreshing={loading}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => markRead(item)}
            className={`rounded-2xl p-4 border ${item.isRead ? "bg-white border-gray-100" : "bg-primary-50 border-primary-200"}`}
          >
            <View className="flex-row items-start gap-2">
              {!item.isRead && <View className="w-2 h-2 rounded-full bg-primary-600 mt-1.5" />}
              <View className="flex-1">
                <Text className={`text-sm ${item.isRead ? "text-gray-700" : "font-semibold text-gray-900"}`}>{item.title}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">{item.body}</Text>
                <Text className="text-[10px] text-gray-400 mt-1">{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-20">
            <Text className="text-5xl mb-3">🔔</Text>
            <Text className="text-gray-400">{loading ? "กำลังโหลด..." : "ยังไม่มีการแจ้งเตือน"}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
