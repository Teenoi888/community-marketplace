import { Tabs } from "expo-router"
import { Text } from "react-native"

export default function BuyerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { paddingBottom: 4, height: 60 },
      }}
    >
      <Tabs.Screen
        name="marketplace/index"
        options={{
          title: "ตลาด",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏪</Text>,
        }}
      />
      <Tabs.Screen
        name="cart/index"
        options={{
          title: "ตะกร้า",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🛒</Text>,
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: "ออเดอร์",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📦</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "โปรไฟล์",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text>,
        }}
      />
    </Tabs>
  )
}
