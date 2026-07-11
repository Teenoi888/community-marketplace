import axios from "axios"
import * as SecureStore from "expo-secure-store"

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api"

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
        await SecureStore.setItemAsync("access_token", data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        await SecureStore.deleteItemAsync("access_token")
      }
    }
    return Promise.reject(error)
  }
)
