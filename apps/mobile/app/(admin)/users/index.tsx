import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface UserRow { id: string; name: string; phone: string | null; email: string | null; role: string; createdAt: string }

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)

  function load(phone?: string) {
    setLoading(true)
    const url = phone ? `/admin/users/search?phone=${encodeURIComponent(phone)}` : "/admin/users"
    api.get(url).then(r => setUsers(r.data.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function toggleRole(user: UserRow) {
    const newRole = user.role === "admin" ? "user" : "admin"
    Alert.alert("เปลี่ยนสิทธิ์ผู้ใช้", `เปลี่ยน "${user.name}" เป็น ${newRole === "admin" ? "แอดมิน" : "ผู้ใช้ทั่วไป"}?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ยืนยัน", onPress: async () => {
          await api.patch(`/admin/users/${user.id}/role`, { role: newRole })
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
        },
      },
    ])
  }

  async function submitReset(userId: string) {
    if (newPassword.length < 6) return Alert.alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
    setSaving(true)
    try {
      await api.patch(`/admin/users/${userId}/reset-password`, { newPassword })
      Alert.alert("สำเร็จ", "รีเซ็ตรหัสผ่านแล้ว")
      setResettingId(null); setNewPassword("")
    } catch {
      Alert.alert("ข้อผิดพลาด", "รีเซ็ตรหัสผ่านไม่สำเร็จ")
    } finally { setSaving(false) }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900 mb-3">จัดการผู้ใช้</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            placeholder="ค้นหาด้วยเบอร์โทร..."
            keyboardType="phone-pad"
            value={search} onChangeText={setSearch}
            onSubmitEditing={() => load(search || undefined)}
          />
          <TouchableOpacity onPress={() => load(search || undefined)} className="px-4 justify-center rounded-xl bg-primary-600">
            <Text className="text-white text-sm font-medium">ค้นหา</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 gap-2 pb-6"
        refreshing={loading}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-2">
                <Text className="font-semibold text-gray-900">{item.name}</Text>
                <Text className="text-xs text-gray-400">{item.phone || item.email || "—"}</Text>
              </View>
              {item.role === "admin" && (
                <View className="bg-primary-50 px-2 py-1 rounded-full"><Text className="text-xs text-primary-700 font-medium">Admin</Text></View>
              )}
            </View>
            <View className="flex-row gap-4 mt-2 pt-2 border-t border-gray-50">
              <TouchableOpacity onPress={() => toggleRole(item)}>
                <Text className="text-xs text-gray-500">{item.role === "admin" ? "ถอดสิทธิ์ Admin" : "ตั้งเป็น Admin"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setResettingId(resettingId === item.id ? null : item.id)} className="ml-auto">
                <Text className="text-xs text-red-400">รีเซ็ตรหัสผ่าน</Text>
              </TouchableOpacity>
            </View>

            {resettingId === item.id && (
              <View className="mt-3 pt-3 border-t border-gray-50 flex-row gap-2">
                <TextInput
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => submitReset(item.id)} disabled={saving} className="px-4 justify-center rounded-xl bg-primary-600">
                  <Text className="text-white text-sm font-medium">{saving ? "..." : "ยืนยัน"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={() => <Text className="text-gray-400 text-center py-10">{loading ? "กำลังโหลด..." : "ไม่พบผู้ใช้"}</Text>}
      />
    </SafeAreaView>
  )
}
