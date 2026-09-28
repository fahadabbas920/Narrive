import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Reader is public by default. Only the reading experience itself
// (/story/<id>/read) requires an authenticated session — browsing the
// catalogue and story detail pages stays open to everyone.
export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname } = request.nextUrl

  const isAuthPage = pathname === "/login" || pathname === "/register"
  const isReadingPage = /^\/story\/[^/]+\/read\/?$/.test(pathname)

  if (!token && isReadingPage) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // Already signed in — keep them out of the auth pages.
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/story/:id/read", "/login", "/register"],
}
