import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native"
import { Link, useRouter } from "expo-router"
import { useState } from "react"
import { api } from "../../lib/api"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function sendResetCode() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return Alert.alert("อีเมลไม่ถูกต้อง")
    setSubmitting(true)
    try {
      await api.post("/auth/password/forgot", { email })
      setSent(true)
      Alert.alert("ส่งแล้ว", "ถ้าอีเมลนี้มีอยู่ในระบบ เราได้ส่งรหัสไปให้แล้ว")
    } catch {
      Alert.alert("ข้อผิดพลาด", "ส่งรหัสไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setSubmitting(false)
    }
  }

  async function resetPassword() {
    if (code.length !== 6) return Alert.alert("กรุณากรอกรหัส OTP 6 หลัก")
    if (newPassword.length < 6) return Alert.alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
    if (newPassword !== confirmPassword) return Alert.alert("รหัสผ่านไม่ตรงกัน")

    setSubmitting(true)
    try {
      await api.post("/auth/password/reset", { email, code, newPassword })
      Alert.alert("สำเร็จ", "ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง", [
        { text: "ตกลง", onPress: () => router.replace("/(auth)/login") },
      ])
    } catch {
      Alert.alert("ข้อผิดพลาด", "รหัส OTP ไม่ถูกต้องหรือหมดอายุ")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-6 pt-16">
      <View className="items-center mb-8">
        <View className="w-16 h-16 bg-primary-600 rounded-2xl items-center justify-center mb-3">
          <Text className="text-3xl">🏪</Text>
        </View>
        <Text className="text-2xl font-bold text-gray-900">ลืมรหัสผ่าน</Text>
      </View>

      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1.5">อีเมลที่ผูกกับบัญชี</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-white"
            editable={!sent}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {sent && (
          <>
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">รหัส OTP (6 หลัก)</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3.5 text-base tracking-widest"
                placeholder="123456" keyboardType="number-pad"
                value={code} onChangeText={t => setCode(t.replace(/\D/g, "").slice(0, 6))}
              />
            </View>
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">รหัสผ่านใหม่</Text>
              <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-base" placeholder="••••••" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            </View>
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">ยืนยันรหัสผ่านใหม่</Text>
              <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-base" placeholder="••••••" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
            </View>
          </>
        )}

        {!sent ? (
          <TouchableOpacity onPress={sendResetCode} disabled={submitting} className={`py-4 rounded-2xl items-center ${submitting ? "bg-primary-400" : "bg-primary-600"}`}>
            <Text className="text-white font-bold text-lg">{submitting ? "กำลังส่ง..." : "ส่งรหัสรีเซ็ตรหัสผ่าน"}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={resetPassword} disabled={submitting} className={`py-4 rounded-2xl items-center ${submitting ? "bg-primary-400" : "bg-primary-600"}`}>
              <Text className="text-white font-bold text-lg">{submitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSent(false); setCode(""); setNewPassword(""); setConfirmPassword("") }}>
              <Text className="text-center text-sm text-gray-500 underline">เปลี่ยนอีเมล / ส่งรหัสใหม่</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View className="mt-6"><Link href="/(auth)/login"><Text className="text-center text-gray-500">‹ กลับไปหน้าเข้าสู่ระบบ</Text></Link></View>
    </ScrollView>
  )
}
