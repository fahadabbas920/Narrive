import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decodeIsAdmin, decodeIsWriter } from "@/lib/jwt"
import { ADMIN_WRITING_HOME } from "@/lib/routes"

// Reader pages are public; reading a story, onboarding, writer mode and admin need a session.
// Writer/admin access is re-checked client-side (/auth/me) and enforced by the API.
export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname, search } = request.nextUrl

  const isAuthPage = pathname === "/login" || pathname === "/register"
  const isWriterPage = pathname === "/write" || pathname.startsWith("/write/")
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/")
  const needsSession =
    isWriterPage ||
    isAdminPage ||
    pathname === "/become-a-writer" ||
    pathname === "/reading" ||
    /^\/story\/[^/]+\/read\/?$/.test(pathname)

  if (!token && needsSession) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname + search)
    if (isWriterPage || pathname === "/become-a-writer") url.searchParams.set("mode", "writer")
    return NextResponse.redirect(url)
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL(decodeIsAdmin(token) ? "/admin" : "/", request.url))
  }

  // /admin only needs a session here: a token issued before the role was granted has no
  // is_admin claim, so AdminGate checks the live role (and the API enforces it).

  // Only a definite `false` claim redirects; legacy tokens without the claim fall through.
  // The writing desk is for writers; admins edit Originals under /admin/originals instead.
  if (token && isWriterPage && decodeIsWriter(token) === false) {
    const home = decodeIsAdmin(token) ? ADMIN_WRITING_HOME : "/become-a-writer"
    return NextResponse.redirect(new URL(home, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/write",
    "/write/:path*",
    "/admin",
    "/admin/:path*",
    "/become-a-writer",
    "/reading",
    "/story/:id/read",
    "/login",
    "/register",
  ],
}
