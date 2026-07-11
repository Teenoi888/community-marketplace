"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

declare global {
  interface Window { liff: any }
}

export default function LiffPage() {
  const router = useRouter()
  const [status, setStatus] = useState("กำลังโหลด Line...")

  useEffect(() => {
    // Load LIFF SDK
    const script = document.createElement("script")
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js"
    script.onload = async () => {
      try {
        await window.liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })

        if (!window.liff.isLoggedIn()) {
          window.liff.login()
          return
        }

        setStatus("กำลังเชื่อมต่อบัญชี...")
        const token = window.liff.getAccessToken()
        const profile = await window.liff.getProfile()

        // Exchange LIFF token for app JWT
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/liff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liffToken: token, profile }),
        })
        const data = await res.json()
        localStorage.setItem("access_token", data.accessToken)

        setStatus("สำเร็จ! กำลังเปิดตลาด...")
        setTimeout(() => router.push("/"), 500)
      } catch (e) {
        setStatus("เกิดข้อผิดพลาด กรุณาลองใหม่")
      }
    }
    document.head.appendChild(script)
  }, [])

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="text-6xl mb-6">🏪</div>
        <h1 className="text-2xl font-bold text-primary-700 mb-2">ตลาดชุมชน</h1>
        <p className="text-gray-500 mb-6">{status}</p>
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}
