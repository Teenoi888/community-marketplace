import { Tabs } from "expo-router"
import { Text } from "react-native"

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { paddingBottom: 4, height: 60 },
      }}
    >
      <Tabs.Screen name="dashboard/index" options={{ title: "ภาพรวม", tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🛡️</Text> }} />
      <Tabs.Screen name="products/index" options={{ title: "สินค้า", tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📦</Text> }} />
      <Tabs.Screen name="users/index" options={{ title: "ผู้ใช้", tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text> }} />
      <Tabs.Screen name="categories/index" options={{ href: null }} />
      <Tabs.Screen name="activity-logs/index" options={{ href: null }} />
    </Tabs>
  )
}
