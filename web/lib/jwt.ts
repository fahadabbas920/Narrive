/** Reads the unverified `is_writer` claim. Routing hint only — the API enforces access. */
export function decodeIsWriter(token: string): boolean | undefined {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const claims = JSON.parse(atob(payload)) as { is_writer?: boolean }
    return claims.is_writer
  } catch {
    return undefined
  }
}

/** Only allow in-app relative paths as post-auth redirects. */
export function safeNext(next?: string | null): string | null {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) return next
  return null
}
