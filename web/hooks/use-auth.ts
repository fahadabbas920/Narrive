"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { authApi, type BecomeWriterPayload } from "@/lib/api/auth"
import { decodeIsAdmin, decodeIsWriter, safeNext } from "@/lib/jwt"
import { clearSession, setSession, useSession } from "@/lib/session"
import { showToast } from "@/lib/toast"
import type { LoginFormData, RegisterFormData } from "@/lib/schemas/auth"

export type AuthMode = "reader" | "writer"

interface AuthOptions {
  mode: AuthMode
  next?: string | null
}

function destinationAfterSignIn(token: string, { mode, next }: AuthOptions): string {
  // Super admins always land in the admin console, whatever mode or `next` they came with.
  if (decodeIsAdmin(token)) return "/admin"
  const target = safeNext(next)
  if (target) return target
  if (mode === "writer") return decodeIsWriter(token) ? "/write" : "/become-a-writer"
  return "/"
}

export function useMe() {
  const session = useSession()
  return useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    enabled: !!session,
    staleTime: 5 * 60_000,
  })
}

export function useSignIn(options: AuthOptions) {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginFormData) => authApi.signin(data.email, data.password),
    onSuccess: (token, variables) => {
      setSession(token.access_token, variables.email)
      queryClient.removeQueries({ queryKey: ["me"] })
      showToast.success("Welcome back")
      router.push(destinationAfterSignIn(token.access_token, options))
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Invalid email or password")
    },
  })
}

export function useSignUp(options: AuthOptions) {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RegisterFormData) => {
      await authApi.signup(data.email, data.password)
      return authApi.signin(data.email, data.password)
    },
    onSuccess: (token, variables) => {
      setSession(token.access_token, variables.email)
      queryClient.removeQueries({ queryKey: ["me"] })
      showToast.success("Welcome to Narrive")
      router.push(
        options.mode === "writer"
          ? "/become-a-writer?start=profile"
          : (safeNext(options.next) ?? "/"),
      )
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Registration failed. Please try again.")
    },
  })
}

export function useBecomeWriter() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BecomeWriterPayload) => authApi.becomeWriter(payload),
    onSuccess: (result) => {
      setSession(result.access_token)
      queryClient.setQueryData(["me"], result.user)
      router.push("/write/stories?welcome=1")
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Couldn't create your writer profile. Please try again.")
    },
  })
}

export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return function logout() {
    clearSession()
    queryClient.clear()
    showToast.success("Signed out")
    router.push("/")
  }
}
