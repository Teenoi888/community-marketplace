"use client"
import { useEffect } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="th">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f9fafb", color: "#111827" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>เกิดข้อผิดพลาดบางอย่าง</h1>
            <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32 }}>
              ขออภัยในความไม่สะดวก ลองรีเฟรชหน้านี้อีกครั้ง หากยังพบปัญหาอยู่ กรุณาติดต่อทีมงาน
            </p>
            <button
              onClick={reset}
              style={{
                background: "#16a34a", color: "#fff", border: "none", borderRadius: 12,
                padding: "12px 24px", fontWeight: 600, cursor: "pointer", fontSize: 14,
              }}
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
