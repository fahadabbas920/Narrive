"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PartyPopper, Plus, X } from "lucide-react"
import { useMe } from "@/hooks/use-auth"

export function WelcomeBanner() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data: me } = useMe()

  if (params.get("welcome") !== "1") return null

  return (
    <div className="from-lavender via-sky to-mint animate-in fade-in slide-in-from-top-2 relative mb-8 overflow-hidden rounded-3xl bg-linear-to-br p-6 duration-500">
      <div className="bg-card/40 absolute -top-8 -right-8 h-32 w-32 rotate-12 rounded-[2rem]" />
      <button
        type="button"
        onClick={() => router.replace(pathname)}
        aria-label="Dismiss"
        className="text-foreground/60 hover:text-foreground hover:bg-card/50 absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="bg-card/80 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm">
          <PartyPopper className="text-lavender-ink h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-foreground text-lg font-bold">
            Welcome to your writing desk{me?.pen_name ? `, ${me.pen_name}` : ""}!
          </p>
          <p className="text-foreground/70 text-sm">
            Start with a title, then map scenes and choices on the canvas. You can switch back to
            reading anytime from the top bar.
          </p>
        </div>
        <Link
          href="/write/stories/new"
          className="bg-card text-lavender-ink inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md sm:self-center"
        >
          <Plus className="h-4 w-4" />
          Create your first story
        </Link>
      </div>
    </div>
  )
}
