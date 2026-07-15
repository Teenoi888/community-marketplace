"use client"
import { useEffect, useState } from "react"
import { Zap } from "lucide-react"

function useCountdown(endsAt: string) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    function calc() {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft("หมดเวลา"); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h > 0) setTimeLeft(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
      else setTimeLeft(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [endsAt])

  return timeLeft
}

interface Props {
  discountPct: number
  endsAt: string
  size?: "sm" | "md"
}

export function FlashSaleBadge({ discountPct, endsAt, size = "sm" }: Props) {
  const timeLeft = useCountdown(endsAt)
  if (!timeLeft || timeLeft === "หมดเวลา") return null

  if (size === "sm") {
    return (
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        <div className="flex items-center gap-0.5 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-md">
          <Zap className="w-3 h-3 fill-white" />
          -{discountPct}%
        </div>
        <div className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
          {timeLeft}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
      <Zap className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />
      <div>
        <span className="text-red-600 font-bold text-sm">Flash Sale -{discountPct}%</span>
        <span className="text-gray-500 text-xs ml-2">หมดใน {timeLeft}</span>
      </div>
    </div>
  )
}
