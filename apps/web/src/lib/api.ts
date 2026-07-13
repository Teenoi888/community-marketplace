import axios from "axios"

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401 — only for authenticated requests (those that already had a token)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const hadToken = !!original.headers?.Authorization
    if (error.response?.status === 401 && hadToken && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        localStorage.setItem("access_token", data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem("access_token")
        // Don't auto-redirect — let protected pages handle this themselves
      }
    }
    return Promise.reject(error)
  }
)
