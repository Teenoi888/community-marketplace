import { Tabs } from "expo-router"
import { Text } from "react-native"

export default function SellerLayout() {
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
        name="dashboard/index"
        options={{ title: "หน้าร้าน", tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏪</Text> }}
      />
      <Tabs.Screen
        name="products/index"
        options={{ title: "สินค้า", tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📦</Text> }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{ title: "ออเดอร์", tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🛍️</Text> }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{ title: "แชท", tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💬</Text> }}
      />
      {/* Screens reachable via dashboard quick-links, hidden from the tab bar */}
      <Tabs.Screen name="products/new/index" options={{ href: null }} />
      <Tabs.Screen name="products/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="settings/index" options={{ href: null }} />
      <Tabs.Screen name="analytics/index" options={{ href: null }} />
      <Tabs.Screen name="flash-sales/index" options={{ href: null }} />
      <Tabs.Screen name="inventory/index" options={{ href: null }} />
      <Tabs.Screen name="withdrawals/index" options={{ href: null }} />
      <Tabs.Screen name="coupons/index" options={{ href: null }} />
      <Tabs.Screen name="register-community/index" options={{ href: null }} />
    </Tabs>
  )
}
