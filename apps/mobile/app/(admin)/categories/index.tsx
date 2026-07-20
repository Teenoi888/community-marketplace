import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface Category { id: string; slug: string; name: string; emoji: string; sortOrder: number; isActive: boolean }

export default function AdminCategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("📦")
  const [slug, setSlug] = useState("")
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    api.get("/admin/categories").then(r => setCategories(r.data.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function addCategory() {
    if (!name.trim() || !slug.trim()) return Alert.alert("กรอกชื่อและ slug ให้ครบ")
    setSaving(true)
    try {
      await api.post("/admin/categories", { name, emoji, slug, sortOrder: categories.length, isActive: true })
      setName(""); setSlug(""); setEmoji("📦"); setShowAdd(false)
      load()
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err.response?.data?.error || "เพิ่มไม่สำเร็จ")
    } finally { setSaving(false) }
  }

  async function toggleActive(cat: Category) {
    await api.patch(`/admin/categories/${cat.id}`, { isActive: !cat.isActive })
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isActive: !c.isActive } : c))
  }

  function confirmDelete(id: string) {
    Alert.alert("ลบหมวดหมู่", "ต้องการลบหมวดหมู่นี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: async () => { await api.delete(`/admin/categories/${id}`); setCategories(prev => prev.filter(c => c.id !== id)) } },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">หมวดหมู่สินค้า</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAdd(v => !v)}>
          <Text className="text-primary-600 font-semibold">{showAdd ? "ยกเลิก" : "+ เพิ่ม"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 gap-2 pb-6"
        refreshing={loading}
        ListHeaderComponent={() => !showAdd ? null : (
          <View className="bg-white rounded-2xl border-2 border-primary-200 p-4 mb-2 gap-3">
            <View className="flex-row gap-2">
              <TextInput className="w-16 border border-gray-200 rounded-xl px-3 py-2.5 text-center" value={emoji} onChangeText={setEmoji} />
              <TextInput className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5" placeholder="ชื่อหมวดหมู่" value={name} onChangeText={setName} />
            </View>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="slug (เช่น handicraft)" autoCapitalize="none" value={slug} onChangeText={setSlug} />
            <TouchableOpacity onPress={addCategory} disabled={saving} className="bg-primary-600 rounded-xl py-2.5 items-center">
              <Text className="text-white font-semibold text-sm">{saving ? "กำลังเพิ่ม..." : "เพิ่มหมวดหมู่"}</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 flex-row items-center gap-3">
            <Text className="text-2xl">{item.emoji}</Text>
            <View className="flex-1">
              <Text className="font-medium text-gray-900">{item.name}</Text>
              <Text className="text-xs text-gray-400">{item.slug}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleActive(item)} className={`px-2.5 py-1 rounded-full mr-2 ${item.isActive ? "bg-green-50" : "bg-gray-100"}`}>
              <Text className={`text-xs font-medium ${item.isActive ? "text-green-600" : "text-gray-400"}`}>{item.isActive ? "แสดง" : "ซ่อน"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(item.id)}>
              <Text className="text-xs text-red-400">ลบ</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => <Text className="text-gray-400 text-center py-10">{loading ? "กำลังโหลด..." : "ยังไม่มีหมวดหมู่"}</Text>}
      />
    </SafeAreaView>
  )
}
