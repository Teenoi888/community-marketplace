"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาดบางอย่าง</h1>
        <p className="text-gray-500 text-sm mb-8">
          ขออภัยในความไม่สะดวก ลองรีเฟรชหน้านี้อีกครั้ง หากยังพบปัญหาอยู่ กรุณาติดต่อทีมงาน
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3">
            <RefreshCw className="w-4 h-4" /> ลองใหม่อีกครั้ง
          </button>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Home className="w-4 h-4" /> กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  )
}
