import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface Stats { totalUsers: number; totalProducts: number; totalCommunities: number; totalOrders: number }

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/admin/stats").then(r => setStats(r.data.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">🛡️ ภาพรวมระบบ</Text>
      </View>

      {loading ? <ActivityIndicator color="#16a34a" className="mt-10" /> : (
        <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
          <View className="flex-row flex-wrap gap-3">
            {[
              { label: "ผู้ใช้ทั้งหมด", value: stats?.totalUsers ?? 0, emoji: "👤" },
              { label: "สินค้าทั้งหมด", value: stats?.totalProducts ?? 0, emoji: "📦" },
              { label: "ชุมชนทั้งหมด", value: stats?.totalCommunities ?? 0, emoji: "🏘️" },
              { label: "ออเดอร์ทั้งหมด", value: stats?.totalOrders ?? 0, emoji: "🛍️" },
            ].map(s => (
              <View key={s.label} className="w-[48%] bg-white rounded-2xl p-4">
                <Text className="text-2xl mb-1">{s.emoji}</Text>
                <Text className="text-xl font-bold text-gray-900">{s.value}</Text>
                <Text className="text-xs text-gray-500">{s.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={() => router.push("/(admin)/categories")} className="bg-white rounded-2xl p-4 flex-row items-center gap-3">
            <Text className="text-2xl">🏷️</Text>
            <Text className="font-semibold text-gray-800 flex-1">จัดการหมวดหมู่สินค้า</Text>
            <Text className="text-gray-300">›</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(admin)/activity-logs")} className="bg-white rounded-2xl p-4 flex-row items-center gap-3">
            <Text className="text-2xl">📜</Text>
            <Text className="font-semibold text-gray-800 flex-1">ประวัติกิจกรรม Admin</Text>
            <Text className="text-gray-300">›</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
