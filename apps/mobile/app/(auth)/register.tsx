import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native"
import { Link, useRouter } from "expo-router"
import { useState } from "react"
import { api } from "../../lib/api"
import { useAuthStore } from "../../lib/store/auth"
import * as SecureStore from "expo-secure-store"

export default function RegisterScreen() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (name.trim().length < 2) return Alert.alert("กรุณากรอกชื่อ", "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร")
    if (!/^\d{10}$/.test(phone)) return Alert.alert("เบอร์โทรไม่ถูกต้อง", "เบอร์โทรต้องเป็นตัวเลข 10 หลัก")
    if (password.length < 6) return Alert.alert("รหัสผ่านสั้นเกินไป", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
    if (password !== confirmPassword) return Alert.alert("รหัสผ่านไม่ตรงกัน")

    setLoading(true)
    try {
      const { data } = await api.post("/auth/register", { name, phone, email: email || undefined, password })
      await SecureStore.setItemAsync("access_token", data.accessToken)
      setUser(data.user)
      router.replace("/(buyer)/marketplace")
    } catch (err: any) {
      Alert.alert("สมัครสมาชิกไม่สำเร็จ", err?.response?.data?.error || "กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6 pt-16">
      <View className="items-center mb-8">
        <View className="w-16 h-16 bg-primary-600 rounded-2xl items-center justify-center mb-3">
          <Text className="text-3xl">🏪</Text>
        </View>
        <Text className="text-2xl font-bold text-gray-900">สมัครสมาชิก</Text>
        <Text className="text-gray-500 mt-1">เริ่มซื้อ-ขายสินค้าชุมชนได้เลย</Text>
      </View>

      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">ชื่อ-นามสกุล</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-base" placeholder="สมชาย ใจดี" value={name} onChangeText={setName} />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">เบอร์โทรศัพท์</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-base" placeholder="0812345678" keyboardType="phone-pad"
            value={phone} onChangeText={t => setPhone(t.replace(/\D/g, "").slice(0, 10))} />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">อีเมล (ไม่บังคับ)</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-base" placeholder="you@example.com" keyboardType="email-address"
            autoCapitalize="none" value={email} onChangeText={setEmail} />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">รหัสผ่าน</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-base" placeholder="••••••" secureTextEntry value={password} onChangeText={setPassword} />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">ยืนยันรหัสผ่าน</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-base" placeholder="••••••" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        </View>

        <TouchableOpacity
          className={`py-4 rounded-2xl items-center ${loading ? "bg-primary-400" : "bg-primary-600"}`}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">{loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center mt-6 mb-8">
        <Text className="text-gray-500">มีบัญชีอยู่แล้ว? </Text>
        <Link href="/(auth)/login"><Text className="text-primary-600 font-semibold">เข้าสู่ระบบ</Text></Link>
      </View>
    </ScrollView>
  )
}
