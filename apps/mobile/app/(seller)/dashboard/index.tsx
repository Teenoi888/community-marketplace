import { View, Text, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

const ACTIONS = [
  { emoji: "➕", title: "เพิ่มสินค้า", sub: "ลงขายสินค้าใหม่", route: "/(seller)/products/new" },
  { emoji: "📋", title: "สินค้าของฉัน", sub: "จัดการรายการสินค้า", route: "/(seller)/products" },
  { emoji: "📦", title: "ออเดอร์ที่รับ", sub: "รอยืนยัน / กำลังจัดส่ง", route: "/(seller)/orders" },
  { emoji: "💬", title: "แชทลูกค้า", sub: "ตอบคำถาม นัดรับสินค้า", route: "/(seller)/chat" },
  { emoji: "📊", title: "สถิติร้านค้า", sub: "ยอดขาย สินค้าฮิต", route: "/(seller)/analytics" },
  { emoji: "📈", title: "สต็อกสินค้า", sub: "ปรับจำนวน + ประวัติ", route: "/(seller)/inventory" },
  { emoji: "⚡", title: "Flash Sale", sub: "สร้างโปรลดราคาชั่วคราว", route: "/(seller)/flash-sales" },
  { emoji: "🏷️", title: "คูปองส่วนลด", sub: "สร้างโค้ดส่วนลดให้ลูกค้า", route: "/(seller)/coupons" },
  { emoji: "💰", title: "ถอนเงิน", sub: "ขอถอนยอดขายเข้าบัญชี", route: "/(seller)/withdrawals" },
  { emoji: "⚙️", title: "ตั้งค่าร้าน", sub: "แก้ไขข้อมูลร้าน ธนาคาร", route: "/(seller)/settings" },
]

interface ShopStats { todayOrders: number; monthRevenue: number; totalProducts: number }

function fmt(n: number) { return `฿${n.toLocaleString()}` }

export default function SellerDashboardScreen() {
  const [stats, setStats] = useState<ShopStats | null>(null)

  useEffect(() => {
    api.get("/orders/shop/stats").then(r => setStats(r.data.data)).catch(() => {})
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        <View className="bg-primary-600 px-5 pt-4 pb-8">
          <Text className="text-white text-2xl font-bold">🏪 หน้าร้านของฉัน</Text>
          <Text className="text-primary-100 mt-1">จัดการสินค้าและออเดอร์</Text>
        </View>

        <View className="mx-4 -mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <View className="flex-row gap-0">
            {[
              { label: "ออเดอร์วันนี้", value: String(stats?.todayOrders ?? "—"), emoji: "🛍️" },
              { label: "ยอดเดือนนี้", value: stats ? fmt(stats.monthRevenue) : "—", emoji: "💰" },
              { label: "สินค้า", value: String(stats?.totalProducts ?? "—"), emoji: "📦" },
            ].map((stat, i) => (
              <View key={stat.label} className={`flex-1 items-center ${i > 0 ? "border-l border-gray-100" : ""}`}>
                <Text className="text-2xl mb-1">{stat.emoji}</Text>
                <Text className="text-xl font-bold text-gray-900">{stat.value}</Text>
                <Text className="text-xs text-gray-500 text-center">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="px-4">
          <View className="flex-row flex-wrap gap-3">
            {ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.title}
                onPress={() => router.push(action.route as any)}
                className="w-[48%] bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50"
              >
                <Text className="text-3xl mb-2">{action.emoji}</Text>
                <Text className="font-semibold text-gray-900">{action.title}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">{action.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
