import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useState } from "react"
import * as ImagePicker from "expo-image-picker"
import { api } from "../../../lib/api"

const PROVINCES = ["กรุงเทพมหานคร", "เชียงใหม่", "เชียงราย", "ลำพูน", "ลำปาง", "นครราชสีมา", "ขอนแก่น", "อุดรธานี", "นครสวรรค์", "พิษณุโลก", "ระยอง", "ชลบุรี", "สุราษฎร์ธานี", "นครศรีธรรมราช", "สงขลา", "ภูเก็ต", "กระบี่"]

const PLANS = [
  { id: "free", name: "Free", price: "฿0/เดือน", features: ["สินค้า 20 ชิ้น", "1 ผู้ดูแล", "หน้าร้านพื้นฐาน"] },
  { id: "community", name: "Community", price: "฿299/เดือน", features: ["สินค้าไม่จำกัด", "5 ผู้ดูแล", "Analytics", "แจ้งเตือน LINE"] },
  { id: "pro", name: "Pro", price: "฿799/เดือน", features: ["ทุกอย่างใน Community", "LINE Bot ครบระบบ", "รายงานรายได้"] },
]

export default function RegisterCommunityScreen() {
  const [plan, setPlan] = useState("free")
  const [logoUri, setLogoUri] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [province, setProvince] = useState("")
  const [district, setDistrict] = useState("")
  const [subdistrict, setSubdistrict] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function pickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (!result.canceled) setLogoUri(result.assets[0].uri)
  }

  async function submit() {
    if (name.trim().length < 3) return Alert.alert("ชื่อต้องมีอย่างน้อย 3 ตัวอักษร")
    if (!province) return Alert.alert("กรุณาเลือกจังหวัด")
    if (district.trim().length < 2) return Alert.alert("กรุณากรอกอำเภอ")
    if (subdistrict.trim().length < 2) return Alert.alert("กรุณากรอกตำบล")

    setSubmitting(true)
    try {
      let logoUrl: string | undefined
      if (logoUri) {
        try {
          const formData = new FormData()
          formData.append("file", { uri: logoUri, name: "logo.jpg", type: "image/jpeg" } as any)
          formData.append("folder", "logos")
          const r = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
          logoUrl = r.data.data.url
        } catch { /* skip logo if upload fails */ }
      }

      await api.post("/communities", { name, province, district, subdistrict, description, plan, logoUrl })
      setDone(true)
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally { setSubmitting(false) }
  }

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-6xl mb-4">✅</Text>
        <Text className="text-xl font-bold text-gray-900 mb-2">สร้างชุมชนสำเร็จ!</Text>
        <Text className="text-gray-500 mb-6 text-center">ร้านค้าของคุณพร้อมใช้งานแล้ว เริ่มเพิ่มสินค้าได้เลย</Text>
        <TouchableOpacity onPress={() => router.replace("/(seller)/dashboard")} className="bg-primary-600 rounded-xl py-3.5 w-full items-center">
          <Text className="text-white font-bold">ไปหน้าจัดการร้าน</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">ลงทะเบียนชุมชน</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
        <View className="bg-white rounded-2xl p-4">
          <Text className="font-semibold text-gray-800 mb-3">โลโก้ชุมชน</Text>
          <TouchableOpacity onPress={pickLogo} className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center overflow-hidden">
            {logoUri ? <Image source={{ uri: logoUri }} style={{ width: "100%", height: "100%" }} /> : <Text className="text-3xl text-gray-300">+</Text>}
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-4 gap-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">ชื่อชุมชน/กลุ่ม *</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="เช่น กลุ่มเกษตรอินทรีย์ตำบลหนองแก" value={name} onChangeText={setName} />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">จังหวัด *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {PROVINCES.map(p => (
                <TouchableOpacity key={p} onPress={() => setProvince(p)} className={`px-3 py-2 rounded-full border ${province === p ? "bg-primary-600 border-primary-600" : "border-gray-200"}`}>
                  <Text className={`text-xs font-medium ${province === p ? "text-white" : "text-gray-600"}`}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">อำเภอ *</Text>
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" value={district} onChangeText={setDistrict} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">ตำบล *</Text>
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" value={subdistrict} onChangeText={setSubdistrict} />
            </View>
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">คำอธิบายชุมชน</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" multiline value={description} onChangeText={setDescription} />
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4">
          <Text className="font-semibold text-gray-800 mb-3">เลือกแพ็กเกจ</Text>
          <View className="gap-3">
            {PLANS.map(p => (
              <TouchableOpacity
                key={p.id} onPress={() => setPlan(p.id)}
                className={`rounded-2xl p-4 border-2 ${plan === p.id ? "border-primary-500 bg-primary-50" : "border-gray-100"}`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-bold text-gray-900">{p.name}</Text>
                  <Text className="text-primary-600 font-semibold">{p.price}</Text>
                </View>
                {p.features.map(f => <Text key={f} className="text-xs text-gray-500">• {f}</Text>)}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity onPress={submit} disabled={submitting} className="bg-primary-600 rounded-xl py-4 items-center">
          <Text className="text-white font-bold">{submitting ? "กำลังสร้าง..." : "สร้างชุมชน"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
