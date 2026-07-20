import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Linking } from "react-native"
import { Link, useRouter } from "expo-router"
import { useState } from "react"
import { api } from "../../lib/api"
import { useAuthStore } from "../../lib/store/auth"
import * as SecureStore from "expo-secure-store"

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://cmweb-production-5bff.up.railway.app"

export default function LoginScreen() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!phone || !password) return Alert.alert("กรุณากรอกเบอร์โทรและรหัสผ่าน")
    setLoading(true)
    try {
      const { data } = await api.post("/auth/login", { phone, password })
      await SecureStore.setItemAsync("access_token", data.accessToken)
      setUser(data.user)
      router.replace(data.user.role === "admin" ? "/(admin)/dashboard" : "/(buyer)/marketplace")
    } catch {
      Alert.alert("ข้อผิดพลาด", "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง")
    } finally {
      setLoading(false)
    }
  }

  // LINE/Google/Facebook OAuth need a native redirect back into the app
  // (deep link + backend allowlist) to log the user in automatically; that
  // wiring isn't done yet, so for now this just opens the web login flow.
  function loginWithLine() {
    Linking.openURL(`${WEB_APP_URL}/login`)
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="flex-1 justify-center p-6">
      {/* Logo */}
      <View className="items-center mb-10">
        <View className="w-20 h-20 bg-primary-600 rounded-3xl items-center justify-center mb-4">
          <Text className="text-4xl">🏪</Text>
        </View>
        <Text className="text-3xl font-bold text-gray-900">ตลาดชุมชน</Text>
        <Text className="text-gray-500 mt-1">ขายได้ ไม่โดนหัก GP</Text>
      </View>

      {/* Line Login Button */}
      <TouchableOpacity onPress={loginWithLine} className="bg-[#06C755] py-4 rounded-2xl items-center mb-4 flex-row justify-center gap-3">
        <Text className="text-white font-bold text-lg">เข้าสู่ระบบด้วย LINE</Text>
      </TouchableOpacity>

      <View className="flex-row items-center my-4">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="text-gray-400 text-sm px-3">หรือ</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>

      {/* Phone/Password */}
      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">เบอร์โทรศัพท์</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3.5 text-base"
            placeholder="0812345678"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
        <View>
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-sm font-medium text-gray-700">รหัสผ่าน</Text>
            <Link href="/(auth)/forgot-password"><Text className="text-xs text-primary-600">ลืมรหัสผ่าน?</Text></Link>
          </View>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3.5 text-base"
            placeholder="••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          className={`py-4 rounded-2xl items-center ${loading ? "bg-primary-400" : "bg-primary-600"}`}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-500">ยังไม่มีบัญชี? </Text>
        <Link href="/(auth)/register">
          <Text className="text-primary-600 font-semibold">สมัครสมาชิก</Text>
        </Link>
      </View>
    </ScrollView>
  )
}
