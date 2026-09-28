"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, BookOpen, PlayCircle, Sun, Moon, Hash } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
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

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: story, isLoading } = useQuery({
    queryKey: ["story", id],
    queryFn: () => publicApi.getStory(id),
  })

  function startReading() {
    const readPath = `/story/${id}/read`
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (token) {
      router.push(readPath)
    } else {
      router.push(`/login?next=${encodeURIComponent(readPath)}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-pulse space-y-3 w-full max-w-lg px-6">
          <div className="h-7 bg-muted rounded-xl w-2/3" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3">
        <p className="font-medium text-foreground">Story not found.</p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Back to stories
        </Link>
      </div>
    )
  }

  const startScene = story.scenes.find((s) => s.scene_type === "start")
  const endingCount = story.scenes.filter((s) => s.scene_type === "ending").length

  return (
    <div className="min-h-full">
      <header className="border-border bg-card/80 sticky top-0 z-10 border-b px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All stories
          </Link>
          <div className="flex items-center gap-3">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-14">
        {/* Genres + rating + moods + tags */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {story.content_rating && (
            <span className="text-muted-foreground border-border rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide">
              {contentRatingLabel(story.content_rating)}
            </span>
          )}
          {story.genres?.map((g) => (
            <span
              key={g}
              className="text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-xs font-medium"
            >
              {g}
            </span>
          ))}
          {story.moods?.map((m) => (
            <span
              key={m}
              className="text-muted-foreground bg-muted rounded-full px-3 py-1 text-xs font-medium"
            >
              {m}
            </span>
          ))}
          {story.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal text-xs rounded-full gap-1">
              <Hash className="h-2.5 w-2.5" />
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="text-4xl font-bold tracking-tight leading-tight text-foreground mb-4">
          {story.title}
        </h1>

        <p className="text-muted-foreground text-lg leading-relaxed mb-8">{story.description}</p>

        <Separator className="mb-8" />

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-10">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            {story.scene_count} scenes
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4 text-primary rotate-180" />
            {story.choices.length} choices
          </span>
          {endingCount > 0 && (
            <span>{endingCount} ending{endingCount !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* CTA */}
        {startScene ? (
          <button
            onClick={startReading}
            className="bg-primary text-primary-foreground inline-flex cursor-pointer items-center gap-2.5 rounded-2xl px-8 py-4 text-sm font-semibold shadow-md transition-all hover:opacity-90 hover:shadow-lg"
          >
            <PlayCircle className="h-5 w-5" />
            Start Reading
          </button>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            This story has no start scene yet.
          </p>
        )}
      </main>
    </div>
  )
}
