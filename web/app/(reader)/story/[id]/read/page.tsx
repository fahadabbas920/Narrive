"use client"

import { use, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Flag,
  History,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { publicApi, type PublicStoryDetail } from "@/lib/api/public"
import type { Scene } from "@/lib/api/stories"
import { TEXT_SIZES, useReaderPrefs, type ReaderPrefs, type ReadingTheme } from "@/lib/reader-prefs"
import { loadProgress, saveProgress } from "@/lib/reading-progress"
import { ReadingSettings } from "@/components/reader/reading-settings"
import { AUTO_THEME_CSS, READING_THEMES, themeVars } from "@/components/reader/reading-themes"

const barButton =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-(--read-border) bg-(--read-card) text-(--read-fg) shadow-sm transition-all hover:border-(--read-accent) hover:bg-(--read-soft) active:scale-95 disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none"

export default function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: story, isLoading } = useQuery({
    queryKey: ["public-story", id],
    queryFn: () => publicApi.getStory(id),
  })
  const [prefs, updatePrefs] = useReaderPrefs()
  const { resolvedTheme } = useTheme()
  // resolvedTheme is only known in the browser; wait until after hydration to use it in JS.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
  const theme: ReadingTheme =
    prefs.theme ?? (mounted && resolvedTheme === "dark" ? "night" : "paper")

  // Paint the whole canvas (incl. overscroll areas) in the reading theme.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.backgroundColor
    root.style.backgroundColor = READING_THEMES[theme].bg
    return () => {
      root.style.backgroundColor = previous
    }
  }, [theme])

  const hasStart = !!story?.scenes.some((s) => s.scene_type === "start")

  return (
    <div
      data-reader=""
      style={prefs.theme ? themeVars(prefs.theme) : undefined}
      className="flex min-h-screen flex-col bg-(--read-bg) text-(--read-fg) transition-colors duration-500"
    >
      <style>{AUTO_THEME_CSS}</style>
      {isLoading ? (
        <div className="mx-auto w-full max-w-2xl animate-pulse space-y-4 px-6 pt-32">
          <div className="h-4 w-24 rounded-full bg-(--read-soft)" />
          <div className="h-5 w-full rounded-full bg-(--read-soft)" />
          <div className="h-5 w-11/12 rounded-full bg-(--read-soft)" />
          <div className="h-5 w-4/5 rounded-full bg-(--read-soft)" />
        </div>
      ) : !story || !hasStart ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
          <BookOpen className="h-8 w-8 text-(--read-muted)" />
          <p className="font-semibold">
            {story ? "This story isn't ready to read yet." : "Story not found."}
          </p>
          <Link href="/" className="text-sm font-semibold text-(--read-accent) hover:underline">
            Browse stories
          </Link>
        </div>
      ) : (
        <Reader key={story.id} story={story} prefs={prefs} theme={theme} onPrefs={updatePrefs} />
      )}

      {/* Brightness: a dimmer over the page (settings popover sits above it). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] bg-black transition-opacity duration-300"
        style={{ opacity: ((100 - prefs.brightness) / 100) * 0.85 }}
      />
    </div>
  )
}

function noopSubscribe() {
  return () => {}
}

interface Nav {
  sceneId: string
  history: string[]
}

function Reader({
  story,
  prefs,
  theme,
  onPrefs,
}: {
  story: PublicStoryDetail
  prefs: ReaderPrefs
  theme: ReadingTheme
  onPrefs: (patch: Partial<ReaderPrefs>) => void
}) {
  const scenesById = useMemo(() => new Map(story.scenes.map((s) => [s.id, s])), [story.scenes])
  const start = story.scenes.find((s) => s.scene_type === "start") as Scene
  const endingTotal = story.scenes.filter((s) => s.scene_type === "ending").length

  // Resume from this device's saved progress when it still matches the story.
  const [initial] = useState(() => {
    const saved = loadProgress(story.id)
    if (!saved || !scenesById.has(saved.sceneId))
      return {
        nav: { sceneId: start.id, history: [] },
        endings: saved?.endings ?? [],
        resumed: false,
      }
    const history = saved.history.filter((sid) => scenesById.has(sid))
    return {
      nav: { sceneId: saved.sceneId, history },
      endings: saved.endings,
      resumed: saved.sceneId !== start.id || history.length > 0,
    }
  })
  const [nav, setNav] = useState<Nav>(initial.nav)
  const [endings, setEndings] = useState<string[]>(initial.endings.filter((e) => scenesById.has(e)))
  const [showResume, setShowResume] = useState(initial.resumed)
  const hideBar = useHideOnScroll()

  const scene = scenesById.get(nav.sceneId) ?? start
  const choices = story.choices
    .filter((c) => c.from_scene_id === scene.id)
    .sort((a, b) => a.display_order - b.display_order)
  const isEnding = scene.scene_type === "ending"
  const isOpening = scene.id === start.id && nav.history.length === 0
  const step = nav.history.length + 1
  const progress = isEnding
    ? 100
    : Math.min(92, Math.round((step / Math.max(story.scenes.length, 1)) * 100))

  useEffect(() => {
    saveProgress(story.id, { ...nav, endings })
  }, [story.id, nav, endings])

  function scrollTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
  }

  function go(target: Scene) {
    setNav((n) => ({ sceneId: target.id, history: [...n.history, n.sceneId] }))
    if (target.scene_type === "ending")
      setEndings((e) => (e.includes(target.id) ? e : [...e, target.id]))
    setShowResume(false)
    scrollTop()
  }

  function back() {
    setNav((n) =>
      n.history.length
        ? { sceneId: n.history[n.history.length - 1], history: n.history.slice(0, -1) }
        : n,
    )
    scrollTop()
  }

  function restart() {
    setNav({ sceneId: start.id, history: [] })
    setShowResume(false)
    scrollTop()
  }

  // Keyboard: 1–9 picks a choice, ← goes back.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return
      if (e.key === "ArrowLeft" && nav.history.length) {
        e.preventDefault()
        back()
        return
      }
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= choices.length) {
        const target = scenesById.get(choices[n - 1].to_scene_id)
        if (target) go(target)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const paragraphs = scene.content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const fontFamily =
    prefs.font === "serif"
      ? "var(--font-lora), Georgia, serif"
      : "var(--font-jakarta), system-ui, sans-serif"

  return (
    <>
      {/* Top bar */}
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-(--read-border) bg-(--read-bar) backdrop-blur-md transition-transform duration-300",
          hideBar && "max-lg:-translate-y-full",
        )}
      >
        <div className="mx-auto flex h-18 max-w-3xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Link
            href={`/story/${story.id}`}
            aria-label="Close story"
            title="Close story"
            className={barButton}
          >
            <X className="h-5.5 w-5.5" strokeWidth={2.25} />
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[15px] font-bold">{story.title}</p>
            <div className="mx-auto mt-2 flex max-w-xs items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--read-soft)">
                <div
                  className="h-full rounded-full bg-(--read-accent) transition-[width] duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-(--read-muted) tabular-nums">
                {isEnding ? "The end" : `Step ${step}`}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={back}
              disabled={!nav.history.length}
              aria-label="Previous scene"
              title="Previous scene (←)"
              className={barButton}
            >
              <ArrowLeft className="h-5.5 w-5.5" strokeWidth={2.25} />
            </button>
            <ReadingSettings prefs={prefs} theme={theme} onChange={onPrefs} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[40rem] flex-1 px-5 pt-10 pb-28 sm:px-8 sm:pt-16 lg:pt-20">
        {showResume && (
          <div className="animate-in fade-in slide-in-from-top-2 mb-10 flex items-center gap-3 rounded-2xl border border-(--read-border) bg-(--read-card) p-3 pl-4 text-sm duration-500">
            <History className="h-4 w-4 shrink-0 text-(--read-accent)" />
            <p className="flex-1 text-(--read-muted)">
              <span className="font-semibold text-(--read-fg)">Welcome back.</span> You&apos;re
              right where you left off.
            </p>
            <button
              type="button"
              onClick={restart}
              className="shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold text-(--read-accent) hover:bg-(--read-soft)"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={() => setShowResume(false)}
              aria-label="Dismiss"
              className="shrink-0 cursor-pointer rounded-full p-1 text-(--read-muted) hover:text-(--read-fg)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <article
          key={scene.id}
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 duration-500"
        >
          <p className="mb-6 font-mono text-[11px] font-medium tracking-[0.25em] text-(--read-muted) uppercase">
            {isOpening ? story.title : isEnding ? "An ending" : `Chapter ${step}`}
          </p>

          <div
            style={{ fontFamily, fontSize: TEXT_SIZES[prefs.size], lineHeight: 1.85 }}
            className="space-y-[1.1em] text-pretty"
          >
            {paragraphs.length === 0 ? (
              <p className="text-(--read-muted) italic">This scene is waiting for its words.</p>
            ) : (
              paragraphs.map((para, i) => {
                // Opening word in capitals, like the first line of a book chapter.
                const leadIn = i === 0 && isOpening ? para.match(/^(\S+)(\s[\s\S]*)?$/) : null
                return (
                  <p key={i}>
                    {leadIn ? (
                      <>
                        <span className="text-[0.92em] font-semibold tracking-[0.06em] text-(--read-accent) uppercase">
                          {leadIn[1]}
                        </span>
                        {leadIn[2]}
                      </>
                    ) : (
                      para
                    )}
                  </p>
                )
              })
            )}
          </div>

          <div
            className="my-12 flex items-center justify-center gap-3 text-(--read-muted)"
            aria-hidden
          >
            <span className="h-px w-12 bg-(--read-border)" />
            <span className="text-sm tracking-[0.5em]">⁂</span>
            <span className="h-px w-12 bg-(--read-border)" />
          </div>

          {isEnding ? (
            <EndingCard
              scene={scene}
              steps={step}
              found={endings.length}
              total={endingTotal}
              canGoBack={nav.history.length > 0}
              onRestart={restart}
              onBack={back}
              storyId={story.id}
            />
          ) : choices.length > 0 ? (
            <section aria-label="Choices">
              <p className="mb-4 text-center text-xs font-bold tracking-[0.2em] text-(--read-muted) uppercase">
                Choose a path
              </p>
              <ol className="space-y-3">
                {choices.map((choice, i) => {
                  const target = scenesById.get(choice.to_scene_id)
                  return (
                    <li
                      key={choice.id}
                      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 fill-mode-both duration-500"
                      style={{ animationDelay: `${150 + i * 80}ms` }}
                    >
                      <button
                        type="button"
                        onClick={() => target && go(target)}
                        disabled={!target}
                        className="group flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-(--read-border) bg-(--read-card) px-4 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-(--read-accent) hover:bg-(--read-soft) hover:shadow-md focus-visible:border-(--read-accent) focus-visible:ring-4 focus-visible:ring-(--read-soft) focus-visible:outline-none active:translate-y-0 disabled:opacity-40 sm:px-5 sm:py-5"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-(--read-border) text-sm font-bold text-(--read-muted) transition-colors group-hover:border-(--read-accent) group-hover:bg-(--read-accent) group-hover:text-(--read-bg)">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-[16px] leading-snug font-medium sm:text-[17px]">
                          {choice.text}
                        </span>
                        <ArrowRight className="h-5 w-5 shrink-0 text-(--read-accent) opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </button>
                    </li>
                  )
                })}
              </ol>
              <p className="mt-6 hidden text-center text-xs text-(--read-muted) lg:block">
                Press <Kbd>1</Kbd>
                {choices.length > 1 && (
                  <>
                    –<Kbd>{choices.length}</Kbd>
                  </>
                )}{" "}
                to choose
                {nav.history.length > 0 && (
                  <>
                    {" "}
                    · <Kbd>←</Kbd> to go back
                  </>
                )}
              </p>
            </section>
          ) : (
            <div className="rounded-3xl border border-dashed border-(--read-border) p-6 text-center">
              <Compass className="mx-auto mb-3 h-7 w-7 text-(--read-muted)" />
              <p className="font-semibold">This path isn&apos;t finished yet</p>
              <p className="mt-1 text-sm text-(--read-muted)">
                The author hasn&apos;t written what happens next.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                {nav.history.length > 0 && (
                  <button
                    type="button"
                    onClick={back}
                    className="cursor-pointer rounded-2xl border border-(--read-border) px-5 py-3 text-sm font-semibold hover:bg-(--read-soft)"
                  >
                    Go back a step
                  </button>
                )}
                <button
                  type="button"
                  onClick={restart}
                  className="cursor-pointer rounded-2xl bg-(--read-accent) px-5 py-3 text-sm font-bold text-(--read-bg) hover:opacity-90"
                >
                  Start from the beginning
                </button>
              </div>
            </div>
          )}
        </article>
      </main>
    </>
  )
}

function EndingCard({
  scene,
  steps,
  found,
  total,
  canGoBack,
  onRestart,
  onBack,
  storyId,
}: {
  scene: Scene
  steps: number
  found: number
  total: number
  canGoBack: boolean
  onRestart: () => void
  onBack: () => void
  storyId: string
}) {
  const allFound = total > 0 && found >= total
  const title = scene.title && !/^(new|untitled) scene$/i.test(scene.title) ? scene.title : null
  return (
    <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 relative overflow-hidden rounded-[2rem] border border-(--read-border) bg-(--read-card) p-7 text-center shadow-xl duration-700 sm:p-10">
      <div
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-(--read-soft) blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-(--read-soft)">
          {allFound ? (
            <Sparkles className="h-8 w-8 text-(--read-accent)" />
          ) : (
            <Flag className="h-8 w-8 text-(--read-accent)" />
          )}
        </span>
        <p className="font-mono text-[11px] font-medium tracking-[0.3em] text-(--read-accent) uppercase">
          The end
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {title ?? "You found an ending"}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-(--read-muted)">
          {allFound
            ? "You've discovered every ending in this story. Impressive."
            : total > 1
              ? "Every choice leads somewhere different. What if you'd chosen otherwise?"
              : "Thanks for reading to the end."}
        </p>

        <dl className="mx-auto mt-7 grid max-w-xs grid-cols-2 gap-3">
          <div className="rounded-2xl bg-(--read-bg) p-3">
            <dt className="text-[11px] font-semibold text-(--read-muted)">Scenes read</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{steps}</dd>
          </div>
          <div className="rounded-2xl bg-(--read-bg) p-3">
            <dt className="text-[11px] font-semibold text-(--read-muted)">Endings found</dt>
            <dd className="text-2xl font-extrabold tabular-nums">
              {Math.min(found, total)}
              <span className="text-base text-(--read-muted)">/{total}</span>
            </dd>
          </div>
        </dl>
        {total > 1 && (
          <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 w-2 rounded-full",
                  i < found ? "bg-(--read-accent)" : "bg-(--read-border)",
                )}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRestart}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-(--read-accent) px-6 py-3.5 text-sm font-bold text-(--read-bg) shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <RotateCcw className="h-4 w-4" />
            {allFound ? "Read it again" : "Try another path"}
          </button>
          {canGoBack && (
            <button
              type="button"
              onClick={onBack}
              className="cursor-pointer rounded-2xl border border-(--read-border) px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-(--read-soft)"
            >
              Step back
            </button>
          )}
        </div>
        <div className="mt-6 flex justify-center gap-5 text-sm">
          <Link
            href={`/story/${storyId}`}
            className="font-semibold text-(--read-muted) hover:text-(--read-fg)"
          >
            About this story
          </Link>
          <Link href="/" className="font-semibold text-(--read-accent) hover:underline">
            Find more stories →
          </Link>
        </div>
      </div>
    </section>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded-md border border-(--read-border) bg-(--read-card) px-1.5 py-0.5 font-mono text-[11px] text-(--read-fg)">
      {children}
    </kbd>
  )
}

/** Hides the reading bar while scrolling down on touch-size screens; shows it again on scroll up. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    function onScroll() {
      const y = window.scrollY
      if (Math.abs(y - last) < 8) return
      setHidden(y > last && y > 80)
      last = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return hidden
}
