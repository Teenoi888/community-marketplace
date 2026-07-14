import { useCallback, useState } from "react"

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied" }
  | { status: "unsupported" }

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" })

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "unsupported" })
      return
    }
    setState({ status: "loading" })
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ status: "granted", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setState({ status: "denied" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    )
  }, [])

  return { ...state, request }
}
