"use client"
import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuthStore } from "@/lib/store/auth"

const TIMEOUT_MS   = 30 * 60 * 1000   // 30 นาที → logout
const WARNING_MS   = 28 * 60 * 1000   // 28 นาที → แจ้งเตือน (2 นาทีก่อน)

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown",
  "touchstart", "scroll", "click",
] as const

export function useInactivityLogout() {
  const { user, logout } = useAuthStore()
  const router    = useRouter()
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastRef  = useRef<string | number | null>(null)

  const clearTimers = useCallback(() => {
    if (timerRef.current)  clearTimeout(timerRef.current)
    if (warnRef.current)   clearTimeout(warnRef.current)
    if (toastRef.current)  toast.dismiss(toastRef.current)
    timerRef.current = null
    warnRef.current  = null
    toastRef.current = null
  }, [])

  const doLogout = useCallback(() => {
    clearTimers()
    logout()
    toast.info("ออกจากระบบอัตโนมัติ เนื่องจากไม่มีกิจกรรมนาน 30 นาที")
    router.push("/login")
  }, [logout, router, clearTimers])

  const resetTimer = useCallback(() => {
    if (!user) return   // ไม่ได้ login → ไม่ต้องนับ

    clearTimers()

    // แจ้งเตือน 2 นาทีก่อน logout
    warnRef.current = setTimeout(() => {
      toastRef.current = toast.warning(
        "ระบบจะออกจากระบบภายใน 2 นาที หากไม่มีกิจกรรม",
        { duration: 120_000 }
      )
    }, WARNING_MS)

    // Logout จริง
    timerRef.current = setTimeout(doLogout, TIMEOUT_MS)
  }, [user, clearTimers, doLogout])

  useEffect(() => {
    if (!user) {
      clearTimers()
      return
    }

    // เริ่มนับเมื่อ login
    resetTimer()

    // Reset ทุกครั้งที่มี activity
    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, resetTimer, { passive: true })
    )

    return () => {
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetTimer)
      )
      clearTimers()
    }
  }, [user, resetTimer, clearTimers])
}
