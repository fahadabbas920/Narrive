"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, BookOpen, PenLine, Search, Sparkles, X } from "lucide-react"
import { publicApi, type PublicStory } from "@/lib/api/public"
import { useRatingLabel, useTaxonomy } from "@/hooks/use-taxonomy"
import { PageContainer } from "@/components/page-container"
import { ReaderFooter, ReaderHeader } from "@/components/reader-header"
import { PublicStoryCard } from "@/components/public-story-card"
import { useIsWriter } from "@/components/mode-switch"
import { useSession } from "@/lib/session"
import { MultiSelectFilter, type FilterOption } from "@/components/multi-select-filter"

function BranchArt() {
  // A tiny story graph: one start, two branches, three endings.
  const nodes = [
    { x: 150, y: 30, c: "var(--mint)", s: "var(--mint-ink)" },
    { x: 70, y: 120, c: "var(--lavender)", s: "var(--lavender-ink)" },
    { x: 230, y: 120, c: "var(--sky)", s: "var(--sky-ink)" },
    { x: 30, y: 215, c: "var(--blush)", s: "var(--blush-ink)" },
    { x: 130, y: 215, c: "var(--peach)", s: "var(--peach-ink)" },
    { x: 270, y: 215, c: "var(--butter)", s: "var(--butter-ink)" },
  ]
  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 4],
    [2, 5],
  ]
  return (
    <svg viewBox="0 0 300 250" className="h-full w-full" aria-hidden>
      {edges.map(([a, b]) => (
        <path
          key={`${a}-${b}`}
          d={`M${nodes[a].x} ${nodes[a].y + 18} C ${nodes[a].x} ${(nodes[a].y + nodes[b].y) / 2 + 10}, ${nodes[b].x} ${(nodes[a].y + nodes[b].y) / 2 - 10}, ${nodes[b].x} ${nodes[b].y - 18}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth="2.5"
          strokeDasharray="5 6"
          strokeLinecap="round"
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x - 30} y={n.y - 18} width="60" height="36" rx="14" fill={n.c} />
          <rect x={n.x - 16} y={n.y - 4} width="32" height="4" rx="2" fill={n.s} opacity="0.55" />
          <rect x={n.x - 16} y={n.y + 4} width="20" height="4" rx="2" fill={n.s} opacity="0.35" />
        </g>
      ))}
    </svg>
  )
}

function WriteCallout() {
  const session = useSession()
  const isWriter = useIsWriter()
  const href = !session
    ? "/register?mode=writer"
    : isWriter === false
      ? "/become-a-writer"
      : "/write"
  const label = session && isWriter !== false ? "Open your writing desk" : "Become a writer"

  return (
    <section className="from-lavender via-sky to-mint relative overflow-hidden rounded-4xl bg-linear-to-br">
      <div className="bg-card/40 absolute -top-12 -right-12 h-56 w-56 rotate-12 rounded-[3rem]" />
      <div className="bg-card/25 absolute right-40 -bottom-20 h-44 w-44 -rotate-6 rounded-[2.5rem]" />
      <div className="relative grid items-center gap-6 p-8 sm:p-12 md:grid-cols-[1fr_auto]">
        <div className="max-w-lg space-y-3">
          <p className="text-lavender-ink font-mono text-[11px] font-medium tracking-[0.2em] uppercase">
            For storytellers
          </p>
          <h2 className="text-foreground text-3xl font-extrabold tracking-tight">
            Have a story to tell?
          </h2>
          <p className="text-foreground/75 leading-relaxed">
            Map every branch on a visual canvas, then publish it here for readers to explore. Same
            account — just switch to writing.
          </p>
        </div>
        <Link
          href={href}
          className="bg-card text-foreground group inline-flex w-fit items-center gap-3 rounded-full py-2 pr-2 pl-6 text-sm font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <PenLine className="text-lavender-ink h-4 w-4" />
          {label}
          <span className="bg-lavender flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="text-lavender-ink h-4 w-4" />
          </span>
        </Link>
      </div>
    </section>
  )
}

export default function DiscoverPage() {
  const { data: stories, isLoading } = useQuery({
    queryKey: ["public-stories"],
    queryFn: publicApi.listStories,
  })
  const { data: taxonomy } = useTaxonomy()
  const contentRatingLabel = useRatingLabel()
  const [query, setQuery] = useState("")
  const [genres, setGenres] = useState<string[]>([])
  const [moods, setMoods] = useState<string[]>([])
  const [ratings, setRatings] = useState<string[]>([])

  const options = useMemo(() => {
    const list = stories ?? []
    const count = (pick: (s: PublicStory) => string[]) => (value: string) =>
      list.filter((s) => pick(s).includes(value)).length
    const genreCount = count((s) => s.genres ?? [])
    const moodCount = count((s) => s.moods ?? [])
    const ratingCount = count((s) => (s.content_rating ? [s.content_rating] : []))
    // Taxonomy first, then any legacy values stories still carry.
    const withExtras = (base: string[], pick: (s: PublicStory) => string[]) =>
      Array.from(new Set([...base, ...list.flatMap(pick)]))
    return {
      genres: withExtras(taxonomy?.genres ?? [], (s) => s.genres ?? []).map(
        (g): FilterOption => ({
          value: g,
          label: g,
          count: genreCount(g),
        }),
      ),
      moods: withExtras(taxonomy?.moods ?? [], (s) => s.moods ?? []).map(
        (m): FilterOption => ({
          value: m,
          label: m,
          count: moodCount(m),
        }),
      ),
      ratings: (taxonomy?.content_ratings ?? []).map(
        (r): FilterOption => ({
          value: r.value,
          label: r.label,
          hint: r.hint,
          count: ratingCount(r.value),
        }),
      ),
    }
  }, [stories, taxonomy])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const anyOf = (picked: string[], values: string[] | undefined) =>
      picked.length === 0 || picked.some((p) => values?.includes(p))
    return (stories ?? []).filter(
      (s) =>
        anyOf(genres, s.genres) &&
        anyOf(moods, s.moods) &&
        anyOf(ratings, s.content_rating ? [s.content_rating] : []) &&
        (!q ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.author_name?.toLowerCase().includes(q)),
    )
  }, [stories, query, genres, moods, ratings])

  const activeFilters = [
    ...genres.map((v) => ({
      key: `g-${v}`,
      label: v,
      remove: () => setGenres(genres.filter((x) => x !== v)),
    })),
    ...moods.map((v) => ({
      key: `m-${v}`,
      label: v,
      remove: () => setMoods(moods.filter((x) => x !== v)),
    })),
    ...ratings.map((v) => ({
      key: `r-${v}`,
      label: contentRatingLabel(v) ?? v,
      remove: () => setRatings(ratings.filter((x) => x !== v)),
    })),
  ]
  const filtering = !!query.trim() || activeFilters.length > 0

  function clearAll() {
    setQuery("")
    setGenres([])
    setMoods([])
    setRatings([])
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ReaderHeader />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="bg-peach/70 absolute -top-32 -left-24 -z-10 h-80 w-80 rounded-full blur-3xl" />
        <div className="bg-lavender/80 absolute top-0 -right-32 -z-10 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-mint/50 absolute -bottom-40 left-1/3 -z-10 h-72 w-72 rounded-full blur-3xl" />
        <PageContainer className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="bg-card/70 text-peach-ink ring-border mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Interactive fiction
            </div>
            <h1 className="text-foreground max-w-xl text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-6xl">
              Every choice shapes{" "}
              <span className="from-peach-ink via-blush-ink to-lavender-ink bg-linear-to-r bg-clip-text text-transparent">
                your story
              </span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-md text-lg leading-relaxed">
              Browse published stories and decide how they end. Every path leads somewhere
              different.
            </p>
            <a
              href="#stories"
              className="bg-foreground text-background mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <BookOpen className="h-4 w-4" />
              Start exploring
            </a>
          </div>
          <div className="bg-card/60 ring-border shadow-lavender-ink/5 hidden h-72 rounded-4xl p-8 shadow-xl ring-1 backdrop-blur-sm lg:block">
            <BranchArt />
          </div>
        </PageContainer>
      </section>

      {/* Stories */}
      <main id="stories" className="scroll-mt-20 pb-20">
        <PageContainer className="space-y-16">
          <div>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="shrink-0">
                <h2 className="text-foreground text-2xl font-extrabold tracking-tight">
                  All stories
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {isLoading
                    ? "Loading stories…"
                    : filtering
                      ? `${filtered.length} of ${stories?.length ?? 0} stories`
                      : `${stories?.length ?? 0} published`}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center" role="search">
                <label className="bg-card border-border focus-within:border-ring focus-within:ring-ring/40 flex h-10 w-full items-center gap-2 rounded-full border px-4 transition-all focus-within:ring-4 sm:w-64">
                  <Search className="text-muted-foreground h-4 w-4 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search title, author…"
                    aria-label="Search stories"
                    className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </label>
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Filter stories"
                >
                  <MultiSelectFilter
                    label="Genre"
                    options={options.genres}
                    selected={genres}
                    onChange={setGenres}
                  />
                  <MultiSelectFilter
                    label="Mood"
                    options={options.moods}
                    selected={moods}
                    onChange={setMoods}
                  />
                  <MultiSelectFilter
                    label="Rating"
                    options={options.ratings}
                    selected={ratings}
                    onChange={setRatings}
                  />
                </div>
              </div>
            </div>

            {filtering && (
              <div className="mb-6 flex flex-wrap items-center gap-1.5">
                {activeFilters.map((f) => (
                  <span
                    key={f.key}
                    className="bg-card border-border text-foreground inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-xs font-semibold"
                  >
                    {f.label}
                    <button
                      type="button"
                      onClick={f.remove}
                      aria-label={`Remove ${f.label} filter`}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-5 w-5 cursor-pointer items-center justify-center rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-muted-foreground hover:text-foreground cursor-pointer px-2 text-xs font-semibold"
                >
                  Clear all
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-card border-border h-72 animate-pulse rounded-3xl border"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-card border-border flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed py-20 text-center">
                <div className="bg-peach flex h-14 w-14 items-center justify-center rounded-2xl">
                  <BookOpen className="text-peach-ink h-7 w-7" />
                </div>
                <p className="text-foreground font-bold">
                  {filtering ? "No stories match that" : "No stories published yet"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {filtering
                    ? "Try another search or genre."
                    : "Check back soon — or write the first one."}
                </p>
                {filtering && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-primary mt-1 cursor-pointer text-sm font-semibold hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((story) => (
                  <PublicStoryCard key={story.id} story={story} />
                ))}
              </div>
            )}
          </div>

          <WriteCallout />
        </PageContainer>
      </main>

      <ReaderFooter />
    </div>
  )
}
