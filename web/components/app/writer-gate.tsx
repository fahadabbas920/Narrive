"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMe } from "@/hooks/use-auth"

export function WriterGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: me, isPending } = useMe()
  const allowed = me?.is_writer === true

  useEffect(() => {
    if (me && !me.is_writer) router.replace("/become-a-writer")
  }, [me, router])

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
