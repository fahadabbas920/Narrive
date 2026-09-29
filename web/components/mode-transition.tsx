"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BookOpen, Feather, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export type AppMode = "reader" | "writer" | "admin"

/** Which mode a path belongs to; null for sign-in pages, which never get the screen. */
export function modeOf(pathname: string): AppMode | null {
  if (pathname === "/login" || pathname === "/register") return null
  if (/^\/(write|become-a-writer)(\/|$)/.test(pathname)) return "writer"
  if (/^\/admin(\/|$)/.test(pathname)) return "admin"
  return "reader"
}

/** Long enough to read the message, short enough not to feel slow. */
const MIN_VISIBLE_MS = 1100
const FADE_OUT_MS = 450
const SAFETY_MS = 8000

interface Transition {
  mode: AppMode
  from: string
  startedAt: number
  phase: "in" | "out"
}

const ModeTransitionContext = createContext<(href: string, mode: AppMode) => void>(() => {})

export function useModeTransition() {
  return useContext(ModeTransitionContext)
}

export function ModeTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [transition, setTransition] = useState<Transition | null>(null)
  // A ref, not state, so two clicks in the same tick can't start two transitions.
  const busy = useRef(false)

  const go = useCallback(
    (href: string, mode: AppMode) => {
      if (busy.current) return
      busy.current = true
      setTransition({ mode, from: window.location.pathname, startedAt: Date.now(), phase: "in" })
      router.push(href)
    },
    [router],
  )

  // Any in-app link that crosses modes plays the screen, so no link has to opt in. Capture
  // phase runs before next/link's handler, and preventDefault stops its own navigation.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const from = modeOf(window.location.pathname)
      const to = modeOf(url.pathname)
      if (!from || !to || from === to) return
      e.preventDefault()
      go(url.pathname + url.search + url.hash, to)
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [go])

  // Leave once the new page has rendered (pathname changed) and the minimum time has passed.
  useEffect(() => {
    if (!transition || transition.phase !== "in") return
    const arrived = pathname !== transition.from
    const wait = arrived
      ? Math.max(0, MIN_VISIBLE_MS - (Date.now() - transition.startedAt))
      : SAFETY_MS
    const timer = setTimeout(() => setTransition((t) => (t ? { ...t, phase: "out" } : t)), wait)
    return () => clearTimeout(timer)
  }, [pathname, transition])

  useEffect(() => {
    if (transition?.phase !== "out") return
    const timer = setTimeout(() => {
      setTransition(null)
      busy.current = false
    }, FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [transition?.phase])

  return (
    <ModeTransitionContext.Provider value={go}>
      {children}
      {transition && (
        <TransitionScreen mode={transition.mode} leaving={transition.phase === "out"} />
      )}
    </ModeTransitionContext.Provider>
  )
}

const COPY: Record<AppMode, { eyebrow: string; title: string; lines: string[] }> = {
  writer: {
    eyebrow: "Writing mode",
    title: "Opening your writing desk",
    lines: [
      "Sharpening pencils…",
      "Unrolling the canvas…",
      "Gathering plot twists…",
      "Untangling story threads…",
    ],
  },
  admin: {
    eyebrow: "Admin console",
    title: "Opening the control room",
    lines: [
      "Counting the readers…",
      "Straightening the shelves…",
      "Checking every ending…",
      "Polishing the Originals…",
    ],
  },
  reader: {
    eyebrow: "Reading mode",
    title: "Heading to the library",
    lines: [
      "Dusting off the shelves…",
      "Finding your bookmark…",
      "Brewing a cup of tea…",
      "Fluffing the reading nook…",
    ],
  },
}

const THEME: Record<
  AppMode,
  { bg: string; blobs: [string, string, string]; ink: string; dots: string[] }
> = {
  writer: {
    bg: "from-lavender via-sky to-mint",
    blobs: ["bg-lavender", "bg-sky", "bg-blush"],
    ink: "text-lavender-ink",
    dots: ["bg-lavender-ink", "bg-sky-ink", "bg-mint-ink"],
  },
  admin: {
    bg: "from-butter via-peach to-lavender",
    blobs: ["bg-butter", "bg-peach", "bg-lavender"],
    ink: "text-butter-ink",
    dots: ["bg-butter-ink", "bg-peach-ink", "bg-lavender-ink"],
  },
  reader: {
    bg: "from-peach via-blush to-butter",
    blobs: ["bg-peach", "bg-blush", "bg-lavender"],
    ink: "text-blush-ink",
    dots: ["bg-peach-ink", "bg-blush-ink", "bg-lavender-ink"],
  },
}

function TransitionScreen({ mode, leaving }: { mode: AppMode; leaving: boolean }) {
  const copy = COPY[mode]
  const theme = THEME[mode]
  const Icon = mode === "writer" ? Feather : mode === "admin" ? ShieldCheck : BookOpen
  const [line, setLine] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setLine((l) => (l + 1) % copy.lines.length), 650)
    return () => clearInterval(timer)
  }, [copy.lines.length])

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-opacity duration-500",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {/* Backdrop */}
      <div className={cn("absolute inset-0 bg-linear-to-br", theme.bg)} />
      <div
        className={cn(
          "motion-safe:animate-float absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-80 blur-3xl",
          theme.blobs[0],
        )}
      />
      <div
        className={cn(
          "motion-safe:animate-float-slow absolute -right-20 -bottom-28 h-[28rem] w-[28rem] rounded-full opacity-80 blur-3xl",
          theme.blobs[1],
        )}
      />
      <div
        className={cn(
          "motion-safe:animate-float absolute top-1/3 right-1/4 h-64 w-64 rounded-full opacity-60 blur-3xl [animation-delay:-3s]",
          theme.blobs[2],
        )}
      />
      <div className="bg-card/25 motion-safe:animate-float-slow absolute bottom-[12%] left-[10%] h-40 w-40 rotate-12 rounded-[2.5rem]" />
      <div className="bg-card/20 motion-safe:animate-float absolute top-[14%] right-[12%] h-28 w-28 -rotate-12 rounded-[2rem] [animation-delay:-2s]" />
      <div className="bg-card/15 absolute right-[30%] bottom-[8%] h-20 w-20 rotate-45 rounded-2xl" />

      {/* Centerpiece */}
      <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 relative flex flex-col items-center px-6 text-center duration-500">
        <div className="relative mb-8 flex h-36 w-36 items-center justify-center">
          <span className="bg-card/40 absolute inset-0 rounded-full [animation-duration:2.4s] motion-safe:animate-ping" />
          <span className="bg-card/50 ring-card/70 absolute inset-3 rounded-full ring-1 backdrop-blur-sm" />
          {theme.dots.map((dot, i) => (
            <span
              key={dot}
              className="motion-safe:animate-orbit absolute top-1/2 left-1/2 -mt-1.5 -ml-1.5 h-3 w-3"
              style={{ animationDelay: `${(-3.2 / theme.dots.length) * i}s` }}
            >
              <span className={cn("block h-3 w-3 rounded-full shadow-sm", dot)} />
            </span>
          ))}
          <div className="bg-card motion-safe:animate-bob relative flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl shadow-black/10">
            <Icon className={cn("h-9 w-9", theme.ink)} />
          </div>
        </div>

        <p
          className={cn(
            "mb-3 font-mono text-xs font-medium tracking-[0.25em] uppercase",
            theme.ink,
          )}
        >
          {copy.eyebrow}
        </p>
        <h2 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
          {copy.title}
        </h2>
        <p
          key={line}
          className="text-foreground/70 animate-in fade-in slide-in-from-bottom-1 mt-3 h-6 text-base duration-300"
        >
          {copy.lines[line]}
        </p>

        <div className="mt-7 flex items-center gap-2" aria-hidden>
          {theme.dots.map((dot, i) => (
            <span
              key={dot}
              className={cn("motion-safe:animate-dot h-2.5 w-2.5 rounded-full", dot)}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
