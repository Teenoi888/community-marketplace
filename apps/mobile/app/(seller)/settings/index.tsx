import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export default function ShopSettingsScreen() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", lineNotifyToken: "", lineGroupUrl: "" })

  useEffect(() => {
    api.get("/shops/my").then(r => {
      const d = r.data.data
      setForm({
        name: d.name || "", description: d.description || "",
        lineNotifyToken: d.line_notify_token || "", lineGroupUrl: d.line_group_url || "",
      })
    }).finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api.patch("/shops/my", {
        name: form.name, description: form.description,
        lineNotifyToken: form.lineNotifyToken || undefined, lineGroupUrl: form.lineGroupUrl || undefined,
      })
      Alert.alert("สำเร็จ", "บันทึกแล้ว!")
    } catch {
      Alert.alert("ข้อผิดพลาด", "เกิดข้อผิดพลาด")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SafeAreaView className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#16a34a" /></SafeAreaView>

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">ตั้งค่าร้าน</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
        <View className="bg-white rounded-2xl p-4 gap-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">ชื่อร้าน</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">คำอธิบายร้าน</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" multiline value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} />
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 gap-4">
          <Text className="font-semibold text-gray-800">แจ้งเตือนออเดอร์ผ่าน LINE</Text>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">LINE Notify Token</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" value={form.lineNotifyToken} onChangeText={t => setForm(f => ({ ...f, lineNotifyToken: t }))} secureTextEntry />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">ลิงก์กลุ่ม LINE (สำหรับไรเดอร์)</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" value={form.lineGroupUrl} onChangeText={t => setForm(f => ({ ...f, lineGroupUrl: t }))} />
          </View>
        </View>

        <TouchableOpacity onPress={save} disabled={saving} className="bg-primary-600 rounded-xl py-4 items-center">
          <Text className="text-white font-bold">{saving ? "กำลังบันทึก..." : "บันทึก"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
