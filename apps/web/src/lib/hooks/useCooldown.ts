import { useCallback, useRef, useState } from "react"

export function useCooldown(seconds: number) {
  const [remaining, setRemaining] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRemaining(seconds)
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [seconds])

  return { remaining, start }
}
