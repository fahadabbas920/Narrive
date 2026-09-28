"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api/auth"
import { showToast } from "@workspace/ui/lib/toast"
import type { LoginFormData, RegisterFormData } from "@/lib/schemas/auth"

export function useSignIn() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: LoginFormData) => authApi.signin(data.email, data.password),
    onSuccess: (token, variables) => {
      localStorage.setItem("token", token.access_token)
      localStorage.setItem("userEmail", variables.email)
      document.cookie = `token=${token.access_token}; path=/; max-age=2592000; SameSite=Lax`
      showToast.success("Signed in successfully")
      router.push("/")
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Invalid email or password")
    },
  })
}

export function useSignUp() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: RegisterFormData) => authApi.signup(data.email, data.password),
    onSuccess: () => {
      showToast.success("Account created! Please sign in.")
      router.push("/login")
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Registration failed. Please try again.")
    },
  })
}

export function useLogout() {
  const router = useRouter()

  return function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("userEmail")
    document.cookie = "token=; path=/; max-age=0"
    router.push("/login")
  }
}
