import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import * as ImagePicker from "expo-image-picker"
import { api } from "../../../lib/api"

interface Community {
  id: string; name: string; slug: string; province: string; district: string
  subdistrict: string; description?: string; logoUrl?: string; bannerUrl?: string; memberCount: number
}

export default function MyCommunityScreen() {
  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [district, setDistrict] = useState("")
  const [subdistrict, setSubdistrict] = useState("")
  const [logoUri, setLogoUri] = useState<string | null>(null)

  useEffect(() => {
    api.get("/communities/my").then(r => {
      const c = r.data.data
      setCommunity(c); setName(c.name); setDescription(c.description ?? ""); setDistrict(c.district); setSubdistrict(c.subdistrict)
    }).catch(() => router.replace("/(seller)/register-community")).finally(() => setLoading(false))
  }, [])

  async function pickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (!result.canceled) setLogoUri(result.assets[0].uri)
  }

  async function handleSave() {
    if (!community) return
    setSaving(true)
    try {
      let logoUrl = community.logoUrl
      if (logoUri) {
        try {
          const formData = new FormData()
          formData.append("file", { uri: logoUri, name: "logo.jpg", type: "image/jpeg" } as any)
          formData.append("folder", "logos")
          const r = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
          logoUrl = r.data.data.url
        } catch { /* keep old logo */ }
      }
      const r = await api.patch(`/communities/${community.id}`, { name, description, district, subdistrict, logoUrl })
      setCommunity(r.data.data)
      setEditMode(false)
      setLogoUri(null)
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally { setSaving(false) }
  }

  if (loading) return <SafeAreaView className="flex-1 bg-white items-center justify-center"><ActivityIndicator color="#16a34a" /></SafeAreaView>
  if (!community) return null

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">ชุมชนของฉัน</Text>
        </View>
        <TouchableOpacity onPress={() => setEditMode(v => !v)}>
          <Text className="text-primary-600 font-semibold">{editMode ? "ยกเลิก" : "แก้ไข"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
        <View className="bg-white rounded-2xl p-4 items-center">
          <TouchableOpacity onPress={editMode ? pickLogo : undefined} className="w-20 h-20 rounded-2xl bg-primary-100 items-center justify-center overflow-hidden mb-2">
            {(logoUri || community.logoUrl)
              ? <Image source={{ uri: logoUri || community.logoUrl }} style={{ width: "100%", height: "100%" }} />
              : <Text className="text-3xl">🏘️</Text>}
          </TouchableOpacity>
          {editMode && <Text className="text-xs text-primary-600">แตะเพื่อเปลี่ยนโลโก้</Text>}
          <Text className="text-xs text-gray-400 mt-2">{community.memberCount} สมาชิก</Text>
        </View>

        <View className="bg-white rounded-2xl p-4 gap-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">ชื่อชุมชน</Text>
            {editMode ? <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" value={name} onChangeText={setName} /> : <Text className="text-gray-900">{community.name}</Text>}
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">คำอธิบาย</Text>
            {editMode ? <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" multiline value={description} onChangeText={setDescription} /> : <Text className="text-gray-600">{community.description || "—"}</Text>}
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">อำเภอ</Text>
              {editMode ? <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" value={district} onChangeText={setDistrict} /> : <Text className="text-gray-900">{community.district}</Text>}
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">ตำบล</Text>
              {editMode ? <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" value={subdistrict} onChangeText={setSubdistrict} /> : <Text className="text-gray-900">{community.subdistrict}</Text>}
            </View>
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">จังหวัด</Text>
            <Text className="text-gray-900">{community.province}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push(`/(buyer)/community/${community.slug}`)} className="border border-primary-200 rounded-xl py-3 items-center">
          <Text className="text-primary-600 font-semibold">ดูหน้าชุมชนสาธารณะ</Text>
        </TouchableOpacity>

        {editMode && (
          <TouchableOpacity onPress={handleSave} disabled={saving} className="bg-primary-600 rounded-xl py-4 items-center">
            <Text className="text-white font-bold">{saving ? "กำลังบันทึก..." : "บันทึกข้อมูลชุมชน"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
