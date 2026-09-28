"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Feather } from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/brand"
import { ThemeToggle } from "@/components/theme-toggle"
import { LoginForm } from "@/components/forms/login-form"
import { RegisterForm } from "@/components/forms/register-form"
import type { AuthMode } from "@/hooks/use-auth"

type Kind = "login" | "register"

const MODES = {
  reader: {
    gradient: "from-peach via-blush/80 to-blush",
    ink: "text-blush-ink",
    icon: BookOpen,
    eyebrow: "For readers",
    account: "Reader account",
    pill: "You're in reader mode",
    dot: "bg-blush-ink",
    copy: {
      login: "Pick up where you left off — every story remembers the paths you've taken.",
      register: "Browse freely, then sign up to step inside stories and choose how they unfold.",
    },
  },
  writer: {
    gradient: "from-lavender via-sky/80 to-sky",
    ink: "text-lavender-ink",
    icon: Feather,
    eyebrow: "For writers",
    account: "Writer account",
    pill: "You're in writer mode",
    dot: "bg-lavender-ink",
    copy: {
      login:
        "Your writing desk is waiting — scenes, choices and drafts, right where you left them.",
      register: "Map branching stories on a visual canvas and publish them for readers to explore.",
    },
  },
} as const

const OTHER = { reader: "writer", writer: "reader" } as const

function GradientLayers({ active }: { active: AuthMode }) {
  return (
    <>
      {(Object.keys(MODES) as AuthMode[]).map((m) => (
        <div
          key={m}
          aria-hidden
          className={cn(
            "absolute inset-0 bg-linear-to-br transition-opacity duration-700 ease-out",
            MODES[m].gradient,
            active === m ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </>
  )
}

function Tiles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="bg-card/25 absolute -bottom-24 left-[38%] h-72 w-72 rotate-[20deg] rounded-[3rem]" />
      <div className="bg-card/20 absolute -bottom-10 left-[58%] h-56 w-56 -rotate-12 rounded-[2.5rem]" />
      <div className="bg-card/15 absolute top-[-6rem] right-[10%] h-64 w-64 rotate-12 rounded-[3rem]" />
      <div className="bg-card/15 absolute bottom-[18%] -left-16 h-40 w-40 rotate-45 rounded-[2rem]" />
    </div>
  )
}

export function AuthShell({
  kind,
  initialMode,
  next,
}: {
  kind: Kind
  initialMode: AuthMode
  next?: string
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const m = MODES[mode]
  const other = OTHER[mode]
  const Icon = m.icon
  const OtherIcon = MODES[other].icon

  function switchMode(target: AuthMode) {
    setMode(target)
    const url = new URL(window.location.href)
    url.searchParams.set("mode", target)
    window.history.replaceState(null, "", url)
  }

  const query = new URLSearchParams({ mode, ...(next ? { next } : {}) }).toString()
  const altHref = `/${kind === "login" ? "register" : "login"}?${query}`

  return (
    <div className="relative flex min-h-screen">
      {/* Main zone: hero + card */}
      <section className="relative isolate flex flex-1 flex-col overflow-hidden">
        <GradientLayers active={mode} />
        <Tiles />

        <div className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8">
          <Link
            href="/"
            className="text-foreground/70 hover:text-foreground hover:bg-card/40 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Browse stories
          </Link>
          <ThemeToggle className="hover:bg-card/40" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_420px] lg:gap-16">
          {/* Hero copy */}
          <div
            key={`${mode}-hero`}
            className="animate-in fade-in slide-in-from-bottom-2 hidden duration-500 lg:block"
          >
            <div className="bg-card/50 ring-card/70 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm ring-1 backdrop-blur-sm">
              <Icon className={cn("h-7 w-7", m.ink)} />
            </div>
            <p
              className={cn(
                "mb-3 font-mono text-xs font-medium tracking-[0.25em] uppercase",
                m.ink,
              )}
            >
              {m.eyebrow}
            </p>
            <h1 className="text-foreground mb-4 text-5xl leading-[1.05] font-extrabold tracking-tight">
              {kind === "login" ? "Welcome back" : "Start your story"}
            </h1>
            <p className="text-foreground/75 mb-8 max-w-sm text-lg leading-relaxed">
              {m.copy[kind]}
            </p>
            <span className="bg-card/50 text-foreground/80 ring-card/70 inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs ring-1 backdrop-blur-sm">
              <span className={cn("h-2 w-2 rounded-full", m.dot)} />
              {m.pill}
            </span>
          </div>

          {/* Card */}
          <div className="mx-auto w-full max-w-[420px]">
            {/* Mobile / tablet mode switch */}
            <div className="bg-card/60 ring-card/70 mb-4 flex rounded-full p-1 ring-1 backdrop-blur-sm lg:hidden">
              {(["reader", "writer"] as const).map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => switchMode(target)}
                  aria-pressed={mode === target}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition-all",
                    mode === target
                      ? cn("bg-card shadow-sm", MODES[target].ink)
                      : "text-foreground/60 hover:text-foreground",
                  )}
                >
                  {target === "reader" ? (
                    <BookOpen className="h-4 w-4" />
                  ) : (
                    <Feather className="h-4 w-4" />
                  )}
                  {target === "reader" ? "Reader" : "Writer"}
                </button>
              ))}
            </div>

            <div className="bg-card rounded-[1.75rem] p-7 shadow-2xl shadow-black/10 sm:p-9">
              <div className="flex items-center gap-2.5">
                <BrandMark className="h-8 w-8" />
                <span className="text-foreground font-bold tracking-tight">Narrive</span>
              </div>
              <h2 className="text-foreground mt-6 text-3xl font-extrabold tracking-tight">
                {kind === "login" ? "Log in" : "Create account"}
              </h2>
              <p
                key={`${mode}-sub`}
                className={cn("animate-in fade-in mt-1 text-sm font-medium duration-300", m.ink)}
              >
                {m.account}
              </p>

              <div className="mt-7">
                {kind === "login" ? (
                  <LoginForm mode={mode} next={next} />
                ) : (
                  <RegisterForm mode={mode} next={next} />
                )}
              </div>

              <p className="text-muted-foreground mt-6 text-center text-sm">
                {kind === "login" ? "New here? " : "Already have an account? "}
                <Link href={altHref} className="text-primary font-semibold hover:underline">
                  {kind === "login" ? "Create account" : "Log in"}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Side zone: the other mode */}
      <aside className="relative isolate hidden w-[32%] max-w-md shrink-0 overflow-hidden lg:flex">
        <GradientLayers active={other} />
        <div
          aria-hidden
          className="bg-card/20 absolute -right-20 -bottom-20 h-72 w-72 rotate-12 rounded-[3rem]"
        />
        <div className="relative z-10 flex flex-col justify-center px-10 xl:px-12">
          <div
            key={`${other}-aside`}
            className="animate-in fade-in slide-in-from-right-2 duration-500"
          >
            <span className="bg-card/50 text-foreground/80 ring-card/70 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-medium tracking-widest uppercase ring-1">
              <ArrowUpRight className="h-3 w-3" />
              Switch mode
            </span>
            <div className="bg-card/50 ring-card/70 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
              <OtherIcon className={cn("h-6 w-6", MODES[other].ink)} />
            </div>
            <h2 className="text-foreground mb-3 text-2xl font-extrabold tracking-tight">
              {other === "writer" ? "Here to write stories?" : "Here to read stories?"}
            </h2>
            <p className="text-foreground/75 mb-7 text-sm leading-relaxed">
              {other === "writer"
                ? "Writers use the same account. Switch modes and we'll take you to your writing desk after you sign in."
                : "Every writer is a reader too. Switch modes to head straight to the story catalogue."}
            </p>
            <button
              type="button"
              onClick={() => switchMode(other)}
              className="bg-card text-foreground group inline-flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Switch to {other} mode
              <ArrowRight
                className={cn(
                  "h-4 w-4 transition-transform group-hover:translate-x-0.5",
                  MODES[other].ink,
                )}
              />
            </button>
            <p className="text-foreground/60 mt-5 font-mono text-[11px]">
              One account · both modes
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
