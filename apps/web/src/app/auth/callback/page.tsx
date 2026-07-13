"use client"
import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function AuthCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get("token")
    const error = params.get("error")

    if (token) {
      localStorage.setItem("access_token", token)
      router.replace("/")
    } else if (error) {
      router.replace(`/login?error=${error}`)
    } else {
      router.replace("/login")
    }
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">กำลังเข้าสู่ระบบ...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  )
}
