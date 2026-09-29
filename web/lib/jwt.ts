interface Claims {
  is_writer?: boolean
  is_admin?: boolean
}

function decodeClaims(token: string): Claims | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(payload)) as Claims
  } catch {
    return null
  }
}

/** Reads the unverified `is_writer` claim. Routing hint only — the API enforces access. */
export function decodeIsWriter(token: string): boolean | undefined {
  return decodeClaims(token)?.is_writer
}

/** Reads the unverified `is_admin` claim (absent means not an admin). Routing hint only. */
export function decodeIsAdmin(token: string): boolean {
  return decodeClaims(token)?.is_admin === true
}

/** Only allow in-app relative paths as post-auth redirects. */
export function safeNext(next?: string | null): string | null {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) return next
  return null
}
