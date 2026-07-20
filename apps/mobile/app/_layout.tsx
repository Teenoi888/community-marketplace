import { useEffect } from "react"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as SecureStore from "expo-secure-store"
import { api } from "../lib/api"
import { useAuthStore } from "../lib/store/auth"
import "../global.css"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
})

// Restores the logged-in user from the stored token on app launch. Every
// screen that gates on `useAuthStore(s => s.user)` must also check
// `isLoading` first — otherwise it sees `user: null` for a moment on cold
// start and bounces straight to /login even though the token is valid.
function AuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await SecureStore.getItemAsync("access_token")
      if (!token) { setLoading(false); return }
      try {
        const { data } = await api.get("/auth/me")
        if (!cancelled) setUser(data.data)
      } catch {
        await SecureStore.deleteItemAsync("access_token")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return null
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(buyer)" />
        <Stack.Screen name="(seller)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </QueryClientProvider>
  )
}
