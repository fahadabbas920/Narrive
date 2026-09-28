import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decodeIsWriter } from "@/lib/jwt"

// Reader pages are public; reading a story, onboarding and writer mode need a session.
// Writer access is re-checked client-side (/auth/me) and enforced by the API.
export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname, search } = request.nextUrl

  const isAuthPage = pathname === "/login" || pathname === "/register"
  const isWriterPage = pathname === "/write" || pathname.startsWith("/write/")
  const needsSession =
    isWriterPage || pathname === "/become-a-writer" || /^\/story\/[^/]+\/read\/?$/.test(pathname)

  if (!token && needsSession) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname + search)
    if (isWriterPage || pathname === "/become-a-writer") url.searchParams.set("mode", "writer")
    return NextResponse.redirect(url)
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Only a definite `false` claim redirects; legacy tokens without the claim fall through.
  if (token && isWriterPage && decodeIsWriter(token) === false) {
    return NextResponse.redirect(new URL("/become-a-writer", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/write",
    "/write/:path*",
    "/become-a-writer",
    "/story/:id/read",
    "/login",
    "/register",
  ],
}
