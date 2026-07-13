"use client"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/lib/store/auth"
import { api } from "@/lib/api"
import { Suspense } from "react"

function LineCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const token = params.get("token")
    if (!token) { router.push("/login"); return }

    localStorage.setItem("access_token", token)
    api.get("/auth/me").then((res) => {
      setUser(res.data.data)
      router.push("/")
    }).catch(() => router.push("/login"))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">กำลังเข้าสู่ระบบด้วย LINE...</p>
      </div>
    </div>
  )
}

export default function LineCallbackPage() {
  return <Suspense><LineCallbackInner /></Suspense>
}
