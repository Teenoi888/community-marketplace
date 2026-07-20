import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useCartStore } from "../../../lib/store/cart"

function fmt(n: number) {
  return `฿${n.toLocaleString()}`
}

export default function CartScreen() {
  const {
    items, removeItem, updateQuantity, toggleItem, toggleShop,
    isItemSelected, isShopSelected, selectedTotal, itemCount,
  } = useCartStore()

  const byShop = items.reduce((acc, item) => {
    if (!acc[item.shopId]) acc[item.shopId] = { shopName: item.shopName, items: [] }
    acc[item.shopId].items.push(item)
    return acc
  }, {} as Record<string, { shopName: string; items: typeof items }>)

  const shopEntries = Object.entries(byShop)
  const hasSelection = items.some(i => isItemSelected(i.product.id))

  function confirmRemove(productId: string, name: string) {
    Alert.alert("ลบสินค้า", `ลบ "${name}" ออกจากตะกร้า?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => removeItem(productId) },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-900">ตะกร้าสินค้า</Text>
      </View>

      <FlatList
        data={shopEntries}
        keyExtractor={([shopId]) => shopId}
        contentContainerClassName="px-4 pb-4 gap-3"
        renderItem={({ item: [shopId, shop] }) => (
          <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <TouchableOpacity
              onPress={() => toggleShop(shopId)}
              className="flex-row items-center gap-2 px-4 py-3 border-b border-gray-50"
            >
              <View className={`w-5 h-5 rounded-md border-2 items-center justify-center ${
                isShopSelected(shopId) ? "bg-primary-600 border-primary-600" : "border-gray-300"
              }`}>
                {isShopSelected(shopId) && <Text className="text-white text-xs">✓</Text>}
              </View>
              <Text className="font-semibold text-gray-800 flex-1" numberOfLines={1}>{shop.shopName}</Text>
            </TouchableOpacity>

            {shop.items.map(({ product, quantity }, i) => (
              <View key={product.id} className={`flex-row items-center gap-3 px-4 py-3 ${i < shop.items.length - 1 ? "border-b border-gray-50" : ""}`}>
                <TouchableOpacity
                  onPress={() => toggleItem(product.id)}
                  className={`w-5 h-5 rounded-md border-2 items-center justify-center ${
                    isItemSelected(product.id) ? "bg-primary-600 border-primary-600" : "border-gray-300"
                  }`}
                >
                  {isItemSelected(product.id) && <Text className="text-white text-xs">✓</Text>}
                </TouchableOpacity>

                <View className="w-16 h-16 bg-gray-100 rounded-xl items-center justify-center">
                  <Text className="text-2xl">🛒</Text>
                </View>

                <View className="flex-1">
                  <Text className="font-medium text-gray-900 text-sm" numberOfLines={2}>{product.name}</Text>
                  <Text className="text-primary-600 font-bold mt-1">{fmt(product.price)}</Text>
                </View>

                <View className="items-end gap-2">
                  <View className="flex-row items-center border border-gray-200 rounded-full">
                    <TouchableOpacity
                      onPress={() => updateQuantity(product.id, quantity - 1)}
                      className="w-7 h-7 items-center justify-center"
                    >
                      <Text className="text-gray-600 font-bold">-</Text>
                    </TouchableOpacity>
                    <Text className="w-6 text-center text-sm font-medium">{quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(product.id, Math.min(quantity + 1, product.stock))}
                      className="w-7 h-7 items-center justify-center"
                    >
                      <Text className="text-gray-600 font-bold">+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => confirmRemove(product.id, product.name)}>
                    <Text className="text-red-400 text-xs">ลบ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-20">
            <Text className="text-5xl mb-3">🛒</Text>
            <Text className="text-gray-400 mb-4">ตะกร้าว่างเปล่า</Text>
            <TouchableOpacity
              onPress={() => router.push("/(buyer)/marketplace")}
              className="bg-primary-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">ไปเลือกซื้อสินค้า</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {items.length > 0 && (
        <View className="px-4 py-4 bg-white border-t border-gray-100 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-xs text-gray-400">{itemCount()} ชิ้น</Text>
            <Text className="text-lg font-bold text-primary-600">{fmt(selectedTotal())}</Text>
          </View>
          <TouchableOpacity
            disabled={!hasSelection}
            onPress={() => router.push("/(buyer)/checkout")}
            className={`px-6 py-3.5 rounded-xl ${hasSelection ? "bg-primary-600" : "bg-gray-200"}`}
          >
            <Text className={`font-bold ${hasSelection ? "text-white" : "text-gray-400"}`}>สั่งซื้อ</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}
