"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMe } from "@/hooks/use-auth"
import { ADMIN_WRITING_HOME } from "@/lib/routes"

export function WriterGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: me, isPending } = useMe()
  const allowed = me?.is_writer === true

  useEffect(() => {
    if (!me || allowed) return
    // Admins without a writer profile edit Originals in the admin console instead.
    router.replace(me.admin_role ? ADMIN_WRITING_HOME : "/become-a-writer")
  }, [me, allowed, router])

  if (!allowed) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          className="border-lavender border-t-lavender-ink h-8 w-8 animate-spin rounded-full border-2"
          aria-label={isPending ? "Loading" : "Redirecting"}
        />
      </div>
    )
  }
  return <>{children}</>
}
