import { View, Text, ActivityIndicator } from "react-native"
import { Redirect } from "expo-router"
import { useAuthStore } from "../lib/store/auth"

export default function Index() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="text-gray-400 mt-3">กำลังโหลด...</Text>
      </View>
    )
  }

  if (!user) return <Redirect href="/(auth)/login" />
  if (user.role === "admin") return <Redirect href="/(admin)/dashboard" />
  return <Redirect href="/(buyer)/marketplace" />
}
