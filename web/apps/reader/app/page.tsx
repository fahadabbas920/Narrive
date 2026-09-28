"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { useQuery } from "@tanstack/react-query"
import { BookOpen, ArrowRight, Sun, Moon, Sparkles } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { publicApi, contentRatingLabel } from "@/lib/api"
import { AuthButton } from "@/components/auth-button"

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      title="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  )
}

export default function DiscoverPage() {
  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: publicApi.listStories,
  })

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="border-border bg-card/80 sticky top-0 z-10 border-b px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
              <BookOpen className="text-primary-foreground h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">Narrive</span>
          </Link>
          <div className="flex items-center gap-4">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-linear-to-b from-primary/8 to-transparent border-b border-border/50 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-3">
            <Sparkles className="h-4 w-4" />
            <span>Interactive Fiction</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
            Every choice shapes<br />
            <span className="text-primary">your story</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Browse published stories and decide how they end. Every path leads somewhere different.
          </p>
        </div>
      </div>

      {/* Stories */}
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-foreground">All Stories</h2>
          {stories && <span className="text-muted-foreground text-sm">{stories.length} published</span>}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card h-44 animate-pulse rounded-2xl border border-border" />
            ))}
          </div>
        ) : !stories?.length ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-2xl">
              <BookOpen className="text-primary h-7 w-7" />
            </div>
            <p className="font-medium text-foreground">No stories published yet.</p>
            <p className="text-muted-foreground text-sm">Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/story/${story.id}`}
                className="group bg-card flex flex-col gap-3 rounded-2xl border border-border p-5 shadow-sm hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-base leading-snug group-hover:text-primary transition-colors">
                    {story.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>

                <p className="text-muted-foreground text-sm line-clamp-2 flex-1 leading-relaxed">
                  {story.description}
                </p>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {story.genres?.slice(0, 2).map((g) => (
                    <span
                      key={g}
                      className="text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    >
                      {g}
                    </span>
                  ))}
                  {story.content_rating && (
                    <Badge variant="secondary" className="text-xs font-normal rounded-full uppercase">
                      {contentRatingLabel(story.content_rating)}
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-xs ml-auto">
                    {story.scene_count} scene{story.scene_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
