import { View, Text, FlatList, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface ActivityLog {
  id: string; action: string; targetType: string; targetId: string | null
  details: Record<string, unknown> | null; createdAt: string
  admin: { id: string; name: string } | null
}

const ACTION_LABELS: Record<string, string> = {
  "category.create": "สร้างหมวดหมู่สินค้า",
  "category.update": "แก้ไขหมวดหมู่สินค้า",
  "category.delete": "ลบหมวดหมู่สินค้า",
  "product.update": "แก้ไขสินค้า",
  "product.delete": "ลบสินค้า",
  "user.role_change": "เปลี่ยนสิทธิ์ผู้ใช้",
  "user.reset_password": "รีเซ็ตรหัสผ่านผู้ใช้",
}

const TARGET_EMOJI: Record<string, string> = { category: "🏷️", product: "📦", user: "👤" }

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "เมื่อกี้"
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

export default function ActivityLogsScreen() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/admin/activity-logs?limit=100").then(r => setLogs(r.data.data)).finally(() => setLoading(false))
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">ประวัติกิจกรรม Admin</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 gap-2 pb-6"
        refreshing={loading}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 flex-row items-start gap-3">
            <Text className="text-xl">{TARGET_EMOJI[item.targetType] || "📄"}</Text>
            <View className="flex-1">
              <Text className="font-medium text-gray-900 text-sm">{ACTION_LABELS[item.action] || item.action}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{item.admin?.name || "ระบบ"} · {timeAgo(item.createdAt)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => <Text className="text-gray-400 text-center py-10">{loading ? "กำลังโหลด..." : "ยังไม่มีประวัติกิจกรรม"}</Text>}
      />
    </SafeAreaView>
  )
}
