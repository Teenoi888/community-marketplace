import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useState } from "react"
import * as ImagePicker from "expo-image-picker"
import { api } from "../../../../lib/api"

const CATEGORIES = [
  { id: "fresh_produce", label: "ผักผลไม้สด" },
  { id: "processed_food", label: "อาหารแปรรูป" },
  { id: "agriculture", label: "สินค้าเกษตร" },
  { id: "seafood", label: "อาหารทะเล" },
  { id: "herb", label: "สมุนไพร" },
  { id: "handicraft", label: "งานฝีมือ" },
  { id: "beverage", label: "เครื่องดื่ม" },
  { id: "otop", label: "OTOP" },
]

export default function NewProductScreen() {
  const [images, setImages] = useState<string[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("1")
  const [category, setCategory] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function addImage() {
    if (images.length >= 5) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (!result.canceled) setImages(prev => [...prev, result.assets[0].uri])
  }

  function removeImage(uri: string) {
    setImages(prev => prev.filter(i => i !== uri))
  }

  async function submit() {
    if (name.trim().length < 2) return Alert.alert("กรุณากรอกชื่อสินค้า")
    const priceNum = Number(price)
    if (!priceNum || priceNum <= 0) return Alert.alert("กรอกราคาให้ถูกต้อง")
    if (!category) return Alert.alert("กรุณาเลือกหมวดหมู่")

    setSubmitting(true)
    try {
      const shopRes = await api.get("/auth/me/shop")
      const shopId = shopRes.data.data.id

      const imageUrls: string[] = []
      for (const uri of images) {
        try {
          const formData = new FormData()
          formData.append("file", { uri, name: "product.jpg", type: "image/jpeg" } as any)
          formData.append("folder", "products")
          const r = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
          imageUrls.push(r.data.data.url)
        } catch { /* skip failed image */ }
      }

      await api.post("/products", {
        name, description: description || undefined, price: priceNum,
        stock: Number(stock) || 0, category, shopId, images: imageUrls,
      })
      Alert.alert("สำเร็จ", "เพิ่มสินค้าสำเร็จ!", [{ text: "ตกลง", onPress: () => router.replace("/(seller)/products") }])
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err?.response?.data?.error || "เกิดข้อผิดพลาด")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">เพิ่มสินค้าใหม่</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
        <View className="bg-white rounded-2xl p-4">
          <Text className="font-semibold text-gray-800 mb-3">รูปภาพสินค้า (สูงสุด 5 รูป)</Text>
          <View className="flex-row flex-wrap gap-3">
            {images.map((uri) => (
              <View key={uri} className="w-20 h-20 rounded-xl overflow-hidden relative">
                <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <TouchableOpacity onPress={() => removeImage(uri)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
                  <Text className="text-white text-xs">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity onPress={addImage} className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center">
                <Text className="text-2xl text-gray-400">+</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 gap-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า *</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="เช่น ข้าวไรซ์เบอร์รี่อินทรีย์ 1 กก." value={name} onChangeText={setName} />
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">รายละเอียดสินค้า</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" multiline placeholder="บอกเล่าเกี่ยวกับสินค้า" value={description} onChangeText={setDescription} />
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">ราคา (บาท) *</Text>
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" keyboardType="decimal-pad" placeholder="150" value={price} onChangeText={setPrice} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">จำนวนสต็อก *</Text>
              <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" keyboardType="number-pad" placeholder="50" value={stock} onChangeText={setStock} />
            </View>
          </View>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">หมวดหมู่ *</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.id} onPress={() => setCategory(c.id)}
                  className={`px-3 py-2 rounded-full border ${category === c.id ? "bg-primary-600 border-primary-600" : "border-gray-200"}`}
                >
                  <Text className={`text-xs font-medium ${category === c.id ? "text-white" : "text-gray-600"}`}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={submit} disabled={submitting} className="bg-primary-600 rounded-xl py-4 items-center">
          <Text className="text-white font-bold text-base">{submitting ? "กำลังบันทึก..." : "บันทึกสินค้า"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
