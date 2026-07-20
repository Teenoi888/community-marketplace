import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

interface WithdrawalRequest {
  id: string; amount: string; bankName: string; accountName: string
  status: "pending" | "approved" | "rejected" | "paid"; createdAt: string
}

const STATUS_LABEL: Record<WithdrawalRequest["status"], string> = {
  pending: "รอตรวจสอบ", approved: "อนุมัติแล้ว", rejected: "ถูกปฏิเสธ", paid: "โอนแล้ว",
}
const STATUS_COLOR: Record<WithdrawalRequest["status"], string> = {
  pending: "text-amber-600 bg-amber-50", approved: "text-blue-600 bg-blue-50",
  rejected: "text-red-600 bg-red-50", paid: "text-green-600 bg-green-50",
}

function fmt(n: number) { return `฿${n.toLocaleString()}` }

export default function WithdrawalsScreen() {
  const [shopId, setShopId] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [history, setHistory] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountName, setAccountName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")

  async function loadData(id: string) {
    setLoading(true)
    try {
      const [b, h] = await Promise.all([api.get(`/withdrawals/balance?shopId=${id}`), api.get(`/withdrawals/mine?shopId=${id}`)])
      setBalance(b.data.data.balance)
      setHistory(h.data.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => {
    api.get("/auth/me/shop").then(r => { setShopId(r.data.data.id); loadData(r.data.data.id) }).catch(() => setLoading(false))
  }, [])

  async function submit() {
    if (!shopId) return
    const amt = Number(amount)
    if (!amt || amt <= 0) return Alert.alert("กรอกจำนวนเงินให้ถูกต้อง")
    if (balance != null && amt > balance) return Alert.alert("ยอดคงเหลือไม่พอ")
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) return Alert.alert("กรอกข้อมูลบัญชีให้ครบ")

    setSubmitting(true)
    try {
      await api.post("/withdrawals", { shopId, amount: amt, bankName, accountName, accountNumber })
      setAmount("")
      loadData(shopId)
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err.response?.data?.error || "ส่งคำขอไม่สำเร็จ")
    } finally { setSubmitting(false) }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-2xl">‹</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">ถอนเงิน</Text>
      </View>

      {loading ? <ActivityIndicator color="#16a34a" className="mt-10" /> : !shopId ? (
        <Text className="text-center text-gray-400 mt-10">ยังไม่มีร้านค้า</Text>
      ) : (
        <ScrollView contentContainerClassName="px-4 pb-8 gap-4">
          <View className="bg-white rounded-2xl p-4 flex-row items-center gap-3">
            <Text className="text-3xl">💰</Text>
            <View>
              <Text className="text-xs text-gray-500">ยอดคงเหลือที่ถอนได้</Text>
              <Text className="text-xl font-bold text-gray-900">{fmt(balance ?? 0)}</Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 gap-3">
            <Text className="font-semibold text-gray-800">ขอถอนเงิน</Text>
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="จำนวนเงิน" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="ธนาคาร" value={bankName} onChangeText={setBankName} />
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="ชื่อบัญชี" value={accountName} onChangeText={setAccountName} />
            <TextInput className="border border-gray-200 rounded-xl px-3 py-2.5" placeholder="เลขที่บัญชี" value={accountNumber} onChangeText={setAccountNumber} />
            <TouchableOpacity onPress={submit} disabled={submitting} className="bg-primary-600 rounded-xl py-3 items-center">
              <Text className="text-white font-bold">{submitting ? "กำลังส่ง..." : "ส่งคำขอถอนเงิน"}</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl p-4">
            <Text className="font-semibold text-gray-800 mb-2">ประวัติการถอนเงิน</Text>
            {history.length === 0 ? (
              <Text className="text-sm text-gray-400 text-center py-4">ยังไม่มีประวัติ</Text>
            ) : history.map((h, i) => (
              <View key={h.id} className={`flex-row justify-between items-center py-2 ${i < history.length - 1 ? "border-b border-gray-50" : ""}`}>
                <View>
                  <Text className="font-medium text-gray-900">{fmt(Number(h.amount))}</Text>
                  <Text className="text-xs text-gray-400">{h.bankName} · {new Date(h.createdAt).toLocaleDateString("th-TH")}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${STATUS_COLOR[h.status].split(" ")[1]}`}>
                  <Text className={`text-xs font-medium ${STATUS_COLOR[h.status].split(" ")[0]}`}>{STATUS_LABEL[h.status]}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
