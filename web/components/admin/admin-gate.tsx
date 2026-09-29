"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMe } from "@/hooks/use-auth"

/** Confirms the admin role via /auth/me. The API enforces it on every /admin call regardless. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: me, isPending } = useMe()
  const allowed = !!me?.admin_role

  useEffect(() => {
    if (me && !me.admin_role) router.replace("/")
  }, [me, router])

  if (!allowed) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          className="border-butter border-t-butter-ink h-8 w-8 animate-spin rounded-full border-2"
          aria-label={isPending ? "Loading" : "Redirecting"}
        />
      </div>
    )
  }
  return <>{children}</>
}
