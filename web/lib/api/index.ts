import { apiClient } from "./api-client"

export const client = apiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
})
