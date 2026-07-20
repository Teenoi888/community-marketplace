import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface Address {
  id: string
  label: string
  name: string
  phone: string
  address: string
  province: string
  district: string
  subdistrict: string
  zipCode: string
  isDefault: boolean
}

const EMPTY = { label: "บ้าน", name: "", phone: "", address: "", province: "", district: "", subdistrict: "", zipCode: "" }

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY)

  function load() {
    api.get("/addresses").then(r => setAddresses(r.data.data || [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function submit() {
    if (!form.name || !form.phone || !form.address || !form.province || !form.district || !form.subdistrict || form.zipCode.length !== 5) {
      return Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน (รหัสไปรษณีย์ 5 หลัก)")
    }
    setSubmitting(true)
    try {
      await api.post("/addresses", { ...form, isDefault: addresses.length === 0 })
      setForm(EMPTY)
      setShowForm(false)
      load()
    } catch {
      Alert.alert("ข้อผิดพลาด", "บันทึกที่อยู่ไม่สำเร็จ")
    } finally {
      setSubmitting(false)
    }
  }

  async function setDefault(id: string) {
    await api.patch(`/addresses/${id}`, { isDefault: true })
    load()
  }

  function confirmDelete(id: string) {
    Alert.alert("ลบที่อยู่", "ต้องการลบที่อยู่นี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: async () => { await api.delete(`/addresses/${id}`); load() } },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">ที่อยู่จัดส่ง</Text>
        </View>
        <TouchableOpacity onPress={() => setShowForm(v => !v)}>
          <Text className="text-primary-600 font-semibold">{showForm ? "ยกเลิก" : "+ เพิ่มที่อยู่"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-6 gap-3"
          refreshing={loading}
          ListHeaderComponent={() => !showForm ? null : (
            <View className="bg-white rounded-2xl border-2 border-primary-200 p-4 mb-3 gap-3">
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="ชื่อ-นามสกุล *"
                value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="เบอร์โทรศัพท์ *"
                keyboardType="phone-pad" value={form.phone} onChangeText={t => setForm(f => ({ ...f, phone: t.replace(/\D/g, "").slice(0, 10) }))} />
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="ที่อยู่ (บ้านเลขที่ ซอย ถนน) *"
                multiline value={form.address} onChangeText={t => setForm(f => ({ ...f, address: t }))} />
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="ตำบล/แขวง *"
                value={form.subdistrict} onChangeText={t => setForm(f => ({ ...f, subdistrict: t }))} />
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="อำเภอ/เขต *"
                value={form.district} onChangeText={t => setForm(f => ({ ...f, district: t }))} />
              <View className="flex-row gap-3">
                <TextInput className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5" placeholder="จังหวัด *"
                  value={form.province} onChangeText={t => setForm(f => ({ ...f, province: t }))} />
                <TextInput className="w-28 border border-gray-200 rounded-xl px-3 py-2.5" placeholder="รหัสไปรษณีย์ *"
                  keyboardType="number-pad" value={form.zipCode} onChangeText={t => setForm(f => ({ ...f, zipCode: t.replace(/\D/g, "").slice(0, 5) }))} />
              </View>
              <TouchableOpacity onPress={submit} disabled={submitting} className="bg-primary-600 rounded-xl py-3 items-center">
                <Text className="text-white font-semibold">{submitting ? "กำลังบันทึก..." : "บันทึกที่อยู่"}</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <View className={`bg-white rounded-2xl p-4 border-2 ${item.isDefault ? "border-primary-400" : "border-gray-100"}`}>
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="font-semibold text-gray-800">{item.label}</Text>
                {item.isDefault && <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"><Text className="text-xs text-amber-600 font-medium">หลัก</Text></View>}
              </View>
              <Text className="text-sm font-medium text-gray-900">{item.name} · {item.phone}</Text>
              <Text className="text-sm text-gray-500 mt-0.5">{item.address}, {item.subdistrict}, {item.district}, {item.province} {item.zipCode}</Text>
              <View className="flex-row gap-4 mt-3 pt-3 border-t border-gray-50">
                {!item.isDefault && (
                  <TouchableOpacity onPress={() => setDefault(item.id)}><Text className="text-xs text-gray-500">⭐ ตั้งเป็นหลัก</Text></TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => confirmDelete(item.id)} className="ml-auto"><Text className="text-xs text-red-400">ลบ</Text></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => !showForm ? (
            <View className="items-center py-16">
              <Text className="text-5xl mb-3">📍</Text>
              <Text className="text-gray-400">ยังไม่มีที่อยู่จัดส่ง</Text>
            </View>
          ) : null}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
