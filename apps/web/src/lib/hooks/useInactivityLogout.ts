"use client"
import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store/auth"

const TIMEOUT_MS = 30 * 60 * 1000  // 30 นาที → logout เงียบๆ

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown",
  "touchstart", "scroll", "click",
] as const

export function useInactivityLogout() {
  const { user, logout } = useAuthStore()
  const router   = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const doLogout = useCallback(() => {
    clearTimers()
    logout()
    router.push("/login")
  }, [logout, router, clearTimers])

  const resetTimer = useCallback(() => {
    if (!user) return
    clearTimers()
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
