"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, RotateCcw, Sun, Moon, BookOpen } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { publicApi, type Scene, type Choice } from "@/lib/api"

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground relative flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
      title="Toggle theme"
    >
      <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  )
}

export default function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: story, isLoading } = useQuery({
    queryKey: ["story", id],
    queryFn: () => publicApi.getStory(id),
  })

  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [history, setHistory] = useState<Scene[]>([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (story && !currentScene) {
      const start = story.scenes.find((s) => s.scene_type === "start")
      if (start) setCurrentScene(start)
    }
  }, [story, currentScene])

  function navigateTo(scene: Scene) {
    setVisible(false)
    setTimeout(() => {
      if (currentScene) setHistory((h) => [...h, currentScene])
      setCurrentScene(scene)
      setVisible(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 200)
  }

  function goBack() {
    if (!history.length) return
    setVisible(false)
    setTimeout(() => {
      const prev = history[history.length - 1]
      setHistory((h) => h.slice(0, -1))
      setCurrentScene(prev)
      setVisible(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 200)
  }

  function restart() {
    if (!story) return
    setVisible(false)
    setTimeout(() => {
      const start = story.scenes.find((s) => s.scene_type === "start")
      if (start) {
        setCurrentScene(start)
        setHistory([])
        setVisible(true)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }, 200)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-xl px-6">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-11/12" />
          <div className="h-4 bg-muted rounded w-4/5" />
        </div>
      </div>
    )
  }

  if (!story || !currentScene) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Story not found.</p>
        <Link href="/" className="text-sm text-primary underline">
          Back to stories
        </Link>
      </div>
    )
  }

  const currentChoices: Choice[] = story.choices
    .filter((c) => c.from_scene_id === currentScene.id)
    .sort((a, b) => a.display_order - b.display_order)

  const isEnding = currentScene.scene_type === "ending"
  const step = history.length + 1
  const progress = story.scenes.length > 0 ? Math.round((step / story.scenes.length) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto max-w-xl px-6 py-3 flex items-center justify-between gap-3">
          <Link
            href={`/story/${id}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:block max-w-32 truncate">{story.title}</span>
          </Link>

          {/* Progress bar */}
          <div className="flex-1 max-w-xs">
            <div className="bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {history.length > 0 && (
              <button
                onClick={goBack}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">{step}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Reading area */}
      <main className="flex-1 flex flex-col items-center px-6 py-14">
        <article
          className={cn(
            "w-full max-w-xl transition-opacity duration-200",
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Ending label */}
          {isEnding && (
            <div className="flex items-center gap-2 text-primary text-xs font-semibold tracking-widest uppercase mb-8">
              <div className="h-px flex-1 bg-primary/30" />
              <span>The End</span>
              <div className="h-px flex-1 bg-primary/30" />
            </div>
          )}

          {/* Scene content — serif font */}
          <div
            className="text-[1.0625rem] leading-[1.9] text-foreground space-y-5"
            style={{ fontFamily: "var(--font-lora, serif)" }}
          >
            {currentScene.content.split("\n").filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* Choices or ending */}
          <div className="mt-12 space-y-3">
            {isEnding ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center mb-6">
                  You reached an ending. Try a different path?
                </p>
                <button
                  onClick={restart}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-primary/30 bg-primary/5 px-5 py-4 text-sm font-medium text-primary hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Start from the beginning
                </button>
                <Link
                  href={`/story/${id}`}
                  className="block text-center text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 pt-2"
                >
                  Back to story
                </Link>
              </div>
            ) : currentChoices.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium text-center mb-6">
                  — What do you do? —
                </p>
                {currentChoices.map((choice) => {
                  const target = story.scenes.find((s) => s.id === choice.to_scene_id)
                  return (
                    <button
                      key={choice.id}
                      onClick={() => target && navigateTo(target)}
                      disabled={!target}
                      className="w-full text-left rounded-2xl border border-border bg-card px-5 py-4 text-sm leading-relaxed text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-40"
                    >
                      {choice.text}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-muted-foreground mb-2 text-sm">
                  This path comes to a close — the author hasn&apos;t written further from here.
                </p>
                {history.length > 0 && (
                  <button
                    onClick={goBack}
                    className="border-border text-foreground hover:bg-muted w-full rounded-2xl border px-5 py-3.5 text-sm font-medium transition-colors"
                  >
                    ← Go back
                  </button>
                )}
                <button
                  onClick={restart}
                  className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-5 py-4 text-sm font-medium transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Start from the beginning
                </button>
                <Link
                  href={`/story/${id}`}
                  className="text-muted-foreground hover:text-foreground block pt-1 text-center text-sm underline underline-offset-2"
                >
                  Back to story
                </Link>
              </div>
            )}
          </div>
        </article>
      </main>
    </div>
  )
}
