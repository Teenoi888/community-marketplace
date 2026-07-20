import { View, Text, TouchableOpacity, FlatList, TextInput, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface LiveSession { id: string; title: string; shop_name: string; viewer_count: number; status: string }

export default function LiveListScreen() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [creating, setCreating] = useState(false)

  function refresh() {
    api.get("/live").then(r => setSessions(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 10000)
    return () => clearInterval(t)
  }, [])

  async function startLive() {
    if (!title.trim()) return Alert.alert("กรุณาใส่ชื่อ live")
    setCreating(true)
    try {
      const r = await api.post("/live", { title })
      router.push({ pathname: "/(buyer)/live/broadcast", params: { id: r.data.data.id } })
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err?.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally { setCreating(false) }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">📡 ไลฟ์สด</Text>
        </View>
        <TouchableOpacity onPress={() => setShowForm(v => !v)}>
          <Text className="text-primary-600 font-semibold">{showForm ? "ยกเลิก" : "+ เริ่ม Live"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 gap-3 pb-6"
        refreshing={loading}
        onRefresh={refresh}
        ListHeaderComponent={() => !showForm ? null : (
          <View className="bg-white rounded-2xl border-2 border-red-200 p-4 mb-1 gap-3">
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="ชื่อ live เช่น ไลฟ์ขายผักสดเช้านี้!" value={title} onChangeText={setTitle} />
            <TouchableOpacity onPress={startLive} disabled={creating} className="bg-red-600 rounded-xl py-3 items-center">
              <Text className="text-white font-bold">{creating ? "กำลังเริ่ม..." : "🔴 เริ่มไลฟ์สด"}</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/(buyer)/live/[id]", params: { id: item.id } })}
            className="bg-white rounded-2xl p-4 flex-row items-center gap-3"
          >
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center">
              <Text className="text-xl">🔴</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900" numberOfLines={1}>{item.title}</Text>
              <Text className="text-xs text-gray-400">{item.shop_name} · 👁️ {item.viewer_count} คน</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-16">
            <Text className="text-5xl mb-3">📡</Text>
            <Text className="text-gray-400">{loading ? "กำลังโหลด..." : "ยังไม่มีไลฟ์สดตอนนี้"}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
