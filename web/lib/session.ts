"use client"

import { useSyncExternalStore } from "react"
import { decodeIsWriter } from "./jwt"

const TOKEN_KEY = "token"
const EMAIL_KEY = "userEmail"
const CHANGE_EVENT = "narrive:session"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export interface Session {
  token: string
  email: string | null
  /** From the JWT claim — a routing hint only; the API is the source of truth. */
  isWriter: boolean | undefined
}

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)
}

export function setSession(token: string, email?: string) {
  localStorage.setItem(TOKEN_KEY, token)
  if (email) localStorage.setItem(EMAIL_KEY, email)
  document.cookie = `token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
  document.cookie = "token=; path=/; max-age=0"
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

let cached: { token: string | null; email: string | null; session: Session | null } = {
  token: null,
  email: null,
  session: null,
}

function getSnapshot(): Session | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const email = localStorage.getItem(EMAIL_KEY)
  if (token !== cached.token || email !== cached.email) {
    cached = {
      token,
      email,
      session: token ? { token, email, isWriter: decodeIsWriter(token) } : null,
    }
  }
  return cached.session
}

/** Current session, or null when signed out. Always null during SSR / first hydration pass. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}
