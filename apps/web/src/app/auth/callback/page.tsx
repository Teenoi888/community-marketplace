"use client"
<<<<<<< HEAD
import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
=======
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/lib/store/auth"
import { api } from "@/lib/api"
import { Suspense } from "react"
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c

function AuthCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
<<<<<<< HEAD

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
=======
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
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
<<<<<<< HEAD
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">กำลังเข้าสู่ระบบ...</p>
=======
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">กำลังเข้าสู่ระบบ...</p>
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
<<<<<<< HEAD
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  )
=======
  return <Suspense><AuthCallbackInner /></Suspense>
>>>>>>> 4303a83a775535a96991dbfeb834969f699a406c
}
