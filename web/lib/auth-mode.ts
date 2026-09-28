import type { AuthMode } from "@/hooks/use-auth"
import { safeNext } from "@/lib/jwt"

export function resolveAuthParams(params: { mode?: string; next?: string }): {
  mode: AuthMode
  next?: string
} {
  const next = safeNext(params.next) ?? undefined
  const mode: AuthMode =
    params.mode === "writer" || params.mode === "reader"
      ? params.mode
      : next?.startsWith("/write") || next === "/become-a-writer"
        ? "writer"
        : "reader"
  return { mode, next }
}
