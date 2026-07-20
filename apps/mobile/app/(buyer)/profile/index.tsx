import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import * as SecureStore from "expo-secure-store"
import { api } from "../../../lib/api"
import { useAuthStore } from "../../../lib/store/auth"
import { useWishlistStore } from "../../../lib/store/wishlist"

interface MenuItem {
  emoji: string
  title: string
  onPress: () => void
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const resetWishlist = useWishlistStore((s) => s.reset)
  const [hasShop, setHasShop] = useState(false)
  const [hasCommunity, setHasCommunity] = useState(false)

  useEffect(() => {
    api.get("/auth/me/shop")
      .then(() => setHasShop(true))
      .catch(() => setHasShop(false))
    api.get("/communities/my")
      .then(() => setHasCommunity(true))
      .catch(() => setHasCommunity(false))
  }, [])

  async function handleLogout() {
    Alert.alert("ออกจากระบบ", "ต้องการออกจากระบบใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ออกจากระบบ",
        style: "destructive",
        onPress: async () => {
          try { await api.post("/auth/logout") } catch { /* ignore */ }
          await SecureStore.deleteItemAsync("access_token")
          logout()
          resetWishlist()
          router.replace("/(auth)/login")
        },
      },
    ])
  }

  const menuItems: MenuItem[] = [
    { emoji: "📦", title: "ออเดอร์ของฉัน", onPress: () => router.push("/(buyer)/orders") },
    { emoji: "❤️", title: "รายการโปรด", onPress: () => router.push("/(buyer)/wishlist") },
    { emoji: "📍", title: "ที่อยู่จัดส่ง", onPress: () => router.push("/(buyer)/addresses") },
    { emoji: "🔔", title: "การแจ้งเตือน", onPress: () => router.push("/(buyer)/notifications") },
    { emoji: "💬", title: "ข้อความ", onPress: () => router.push("/(buyer)/chat") },
    hasShop
      ? { emoji: "🏪", title: "หน้าร้านของฉัน", onPress: () => router.push("/(seller)/dashboard") }
      : { emoji: "🏘️", title: "เปิดร้านชุมชน", onPress: () => router.push("/(seller)/register-community") },
    ...(hasCommunity ? [{ emoji: "🏡", title: "ชุมชนของฉัน", onPress: () => router.push("/(buyer)/community/my") }] : []),
    ...(user?.role === "admin" ? [{ emoji: "🛡️", title: "จัดการระบบ (Admin)", onPress: () => router.push("/(admin)/dashboard") }] : []),
  ]

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        <View className="bg-primary-600 px-5 pt-4 pb-8 flex-row items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-white items-center justify-center">
            <Text className="text-primary-700 font-bold text-2xl">{user?.name?.charAt(0) ?? "?"}</Text>
          </View>
          <View>
            <Text className="text-white text-lg font-bold">{user?.name ?? "ผู้ใช้"}</Text>
            <Text className="text-primary-100 text-sm">{user?.phone ?? user?.email ?? ""}</Text>
          </View>
        </View>

        <View className="mx-4 -mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.title}
              onPress={item.onPress}
              className={`flex-row items-center gap-3 px-4 py-4 ${i > 0 ? "border-t border-gray-50" : ""}`}
            >
              <Text className="text-xl">{item.emoji}</Text>
              <Text className="flex-1 font-medium text-gray-800">{item.title}</Text>
              <Text className="text-gray-300">›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="mx-4 mt-4 mb-8 bg-white rounded-2xl border border-red-100 py-4 items-center"
        >
          <Text className="text-red-500 font-semibold">ออกจากระบบ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
