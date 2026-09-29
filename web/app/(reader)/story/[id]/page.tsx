"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Flag,
  GitBranch,
  Hash,
  Lock,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { publicApi } from "@/lib/api/public"
import { useRatingLabel } from "@/hooks/use-taxonomy"
import { storyTone } from "@/lib/story-tone"
import { getToken, useSession } from "@/lib/session"
import { PageContainer } from "@/components/page-container"
import { ReaderFooter, ReaderHeader } from "@/components/reader-header"
import { WriterAvatar } from "@/components/writer-avatar"
import { SaveButton } from "@/components/reader/save-button"
import { EndingsMeter } from "@/components/stats/endings-meter"
import { ReadingStatusBadge } from "@/components/stats/reading-status-badge"
import { useStoryProgress } from "@/hooks/use-reading"
import { timeAgo } from "@/lib/time"

function BackLink() {
  return (
    <Link
      href="/"
      className="text-muted-foreground hover:text-foreground hover:bg-muted -ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      All stories
    </Link>
  )
}

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const session = useSession()
  const contentRatingLabel = useRatingLabel()
  const {
    data: story,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-story", id],
    queryFn: () => publicApi.getStory(id),
  })

  const { data: progress } = useStoryProgress(id)
  const done = progress?.status === "finished" || progress?.status === "all_endings"

  function startReading() {
    // A finished story starts a fresh run; anything else resumes where you left off.
    const readPath = `/story/${id}/read${done ? "?restart=1" : ""}`
    router.push(getToken() ? readPath : `/login?next=${encodeURIComponent(readPath)}`)
  }

  const startScene = story?.scenes.find((s) => s.scene_type === "start")
  const endingCount = story?.scenes.filter((s) => s.scene_type === "ending").length ?? 0

  return (
    <div className="flex min-h-screen flex-col">
      <ReaderHeader />

      <main className="relative isolate flex-1 pb-20">
        <div className="bg-peach/60 pointer-events-none absolute top-0 right-0 -z-10 h-80 w-80 rounded-full blur-3xl" />
        <div className="bg-lavender/60 pointer-events-none absolute top-60 -left-20 -z-10 h-72 w-72 rounded-full blur-3xl" />

        <PageContainer className="pt-6">
          <BackLink />

          {isLoading ? (
            <div className="mt-6 grid animate-pulse gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <div className="bg-muted h-56 rounded-4xl" />
                <div className="bg-muted h-10 w-2/3 rounded-xl" />
                <div className="bg-muted h-4 w-full rounded" />
                <div className="bg-muted h-4 w-5/6 rounded" />
              </div>
              <div className="bg-muted h-80 rounded-3xl" />
            </div>
          ) : isError || !story ? (
            <div className="bg-card border-border mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed py-24 text-center">
              <div className="bg-blush flex h-14 w-14 items-center justify-center rounded-2xl">
                <BookOpen className="text-blush-ink h-7 w-7" />
              </div>
              <p className="text-foreground font-bold">This story isn&apos;t available</p>
              <p className="text-muted-foreground text-sm">
                It may have been unpublished, or the link is wrong.
              </p>
              <Link href="/" className="text-primary mt-1 text-sm font-semibold hover:underline">
                Browse all stories
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
              {/* Story */}
              <article className="min-w-0">
                <div
                  className={cn(
                    "relative mb-8 flex h-48 items-end overflow-hidden rounded-4xl bg-linear-to-br p-6 sm:h-60",
                    storyTone(story.id),
                  )}
                >
                  <div className="bg-card/35 absolute -top-10 right-10 h-40 w-40 rotate-12 rounded-[2.5rem]" />
                  <div className="bg-card/25 absolute -right-10 -bottom-12 h-48 w-48 -rotate-6 rounded-[3rem]" />
                  <div className="bg-card/80 relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm backdrop-blur-sm">
                    <BookOpen className="text-foreground/70 h-6 w-6" />
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap items-center gap-2">
                  {story.genres?.map((g) => (
                    <span
                      key={g}
                      className="bg-lavender text-lavender-ink rounded-full px-3 py-1 text-xs font-bold"
                    >
                      {g}
                    </span>
                  ))}
                  {story.moods?.map((m) => (
                    <span
                      key={m}
                      className="bg-peach text-peach-ink rounded-full px-3 py-1 text-xs font-bold"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                <h1 className="text-foreground text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
                  {story.title}
                </h1>

                {story.author_name && (
                  <Link
                    href={story.author_handle ? `/writers/${story.author_handle}` : "#"}
                    className="hover:bg-muted group mt-5 -ml-2 inline-flex items-center gap-3 rounded-2xl py-1.5 pr-4 pl-2 transition-colors"
                  >
                    <WriterAvatar
                      name={story.author_name}
                      toneName={story.author_tone}
                      className="h-10 w-10 text-sm"
                    />
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs">Written by</p>
                      <p className="text-foreground group-hover:text-primary font-bold transition-colors">
                        {story.author_name}
                      </p>
                    </div>
                    <ArrowRight className="text-muted-foreground h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                )}

                <p className="text-foreground/80 mt-8 max-w-2xl font-serif text-lg leading-[1.85] whitespace-pre-line">
                  {story.description || "The author hasn't written a description yet."}
                </p>

                {story.tags?.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {story.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                      >
                        <Hash className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>

              {/* Reading card */}
              <aside className="lg:sticky lg:top-24">
                <div className="bg-card border-border shadow-lavender-ink/5 rounded-3xl border p-6 shadow-xl">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        icon: BookOpen,
                        value: story.scene_count,
                        label: story.scene_count === 1 ? "scene" : "scenes",
                        tone: "bg-sky text-sky-ink",
                      },
                      {
                        icon: GitBranch,
                        value: story.choices.length,
                        label: story.choices.length === 1 ? "choice" : "choices",
                        tone: "bg-mint text-mint-ink",
                      },
                      {
                        icon: Flag,
                        value: endingCount,
                        label: endingCount === 1 ? "ending" : "endings",
                        tone: "bg-blush text-blush-ink",
                      },
                    ].map(({ icon: Icon, value, label, tone }) => (
                      <div key={label} className="bg-background rounded-2xl p-3 text-center">
                        <div
                          className={cn(
                            "mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl",
                            tone,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-foreground text-xl font-extrabold tabular-nums">
                          {value}
                        </p>
                        <p className="text-muted-foreground text-[11px] font-semibold">{label}</p>
                      </div>
                    ))}
                  </div>

                  {startScene ? (
                    <button
                      type="button"
                      onClick={startReading}
                      className="from-peach via-blush to-lavender text-foreground group mt-5 flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-linear-to-r text-base font-bold shadow-md ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      {done ? (
                        <RotateCcw className="text-blush-ink h-5 w-5" />
                      ) : (
                        <PlayCircle className="text-blush-ink h-5 w-5" />
                      )}
                      {done ? "Read again" : progress ? "Continue reading" : "Start reading"}
                      <span className="bg-card/85 flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5">
                        <ArrowRight className="text-blush-ink h-4 w-4" />
                      </span>
                    </button>
                  ) : (
                    <p className="bg-muted text-muted-foreground mt-5 rounded-2xl p-4 text-center text-sm">
                      This story doesn&apos;t have a start scene yet.
                    </p>
                  )}

                  <SaveButton
                    storyId={story.id}
                    title={story.title}
                    variant="full"
                    className="mt-2 w-full"
                  />

                  {progress && (
                    <div className="bg-background mt-4 space-y-2.5 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-foreground text-xs font-bold">Your progress</p>
                        <ReadingStatusBadge status={progress.status} />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">Scenes explored</span>
                        <span className="text-foreground font-semibold tabular-nums">
                          {progress.scenes_seen} of {progress.scenes_total}
                        </span>
                      </div>
                      <div
                        className="bg-border h-1.5 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-label="Scenes explored"
                        aria-valuemin={0}
                        aria-valuemax={progress.scenes_total}
                        aria-valuenow={progress.scenes_seen}
                      >
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{
                            width: `${(progress.scenes_seen / Math.max(progress.scenes_total, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <EndingsMeter
                          found={progress.endings_found.length}
                          total={progress.endings_total}
                        />
                        <span className="text-muted-foreground">
                          {timeAgo(progress.last_read_at)}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-center text-xs">
                    {session ? (
                      done && progress ? (
                        progress.endings_found.length < progress.endings_total ? (
                          "Take a different path to find another ending."
                        ) : (
                          "You've found every ending. Enjoy it again."
                        )
                      ) : (
                        "Take any path — you can restart anytime."
                      )
                    ) : (
                      <>
                        <Lock className="h-3 w-3" />
                        Free to read — you&apos;ll be asked to sign in.
                      </>
                    )}
                  </p>

                  <dl className="border-border mt-6 space-y-3 border-t pt-5 text-sm">
                    {story.content_rating && (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          Rating
                        </dt>
                        <dd className="text-foreground font-semibold">
                          {contentRatingLabel(story.content_rating)}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Updated
                      </dt>
                      <dd className="text-foreground font-semibold">
                        {new Date(story.updated_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </dd>
                    </div>
                  </dl>
                </div>
              </aside>
            </div>
          )}
        </PageContainer>
      </main>

      <ReaderFooter />
    </div>
  )
}
