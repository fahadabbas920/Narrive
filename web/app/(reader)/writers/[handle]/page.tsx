"use client"

import { use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  AtSign,
  BookOpen,
  CalendarDays,
  Feather,
  Globe,
  Layers,
  Link2,
  MapPin,
  PenLine,
  Split,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { tone } from "@/lib/tones"
import { FEATURES } from "@/lib/features"
import { usePublicWriter } from "@/hooks/use-profile"
import { useMe } from "@/hooks/use-auth"
import { useTaxonomy } from "@/hooks/use-taxonomy"
import { PageContainer } from "@/components/page-container"
import { PublicStoryCard } from "@/components/public-story-card"
import { ReaderFooter, ReaderHeader } from "@/components/reader-header"
import { WriterAvatar } from "@/components/writer-avatar"

function prettyUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
}

export default function WriterProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params)
  const { data: writer, isLoading, isError } = usePublicWriter(handle)
  const { data: me } = useMe()
  const { data: taxonomy } = useTaxonomy()
  const isOwner = !!me?.handle && me.handle === writer?.handle
  const platformLabel = (value: string) =>
    taxonomy?.social_platforms.find((p) => p.value === value)?.label ?? value

  return (
    <div className="flex min-h-screen flex-col">
      <ReaderHeader />

      <main className="flex-1 pb-20">
        <PageContainer className="pt-6">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground hover:bg-muted -ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All stories
          </Link>

          {isLoading ? (
            <div className="mt-4 animate-pulse">
              <div className="bg-muted h-48 rounded-4xl sm:h-56" />
              <div className="bg-muted ring-background relative -mt-12 ml-8 h-28 w-28 rounded-full ring-8" />
              <div className="bg-muted mt-4 h-8 w-64 rounded-xl" />
            </div>
          ) : isError || !writer ? (
            <div className="bg-card border-border mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed py-24 text-center">
              <div className="bg-lavender flex h-14 w-14 items-center justify-center rounded-2xl">
                <Feather className="text-lavender-ink h-7 w-7" />
              </div>
              <p className="text-foreground font-bold">We couldn&apos;t find that writer</p>
              <p className="text-muted-foreground text-sm">
                The link may be old, or the handle has changed.
              </p>
              <Link href="/" className="text-primary mt-1 text-sm font-semibold hover:underline">
                Browse all stories
              </Link>
            </div>
          ) : (
            <>
              {/* Cover + identity */}
              <section className="mt-4">
                <div
                  className={cn(
                    "relative h-44 overflow-hidden rounded-4xl bg-linear-to-br sm:h-56",
                    tone(writer.cover_tone).cover,
                  )}
                >
                  <div className="bg-card/35 absolute -top-12 right-20 h-48 w-48 rotate-12 rounded-[3rem]" />
                  <div className="bg-card/25 absolute -right-12 -bottom-16 h-56 w-56 -rotate-6 rounded-[3rem]" />
                  <div className="bg-card/20 absolute bottom-6 left-1/3 h-16 w-16 rotate-45 rounded-2xl" />
                </div>

                <div className="relative z-10 flex flex-col gap-5 px-2 sm:flex-row sm:items-end sm:justify-between sm:px-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <WriterAvatar
                      name={writer.pen_name}
                      toneName={writer.avatar_tone}
                      className="ring-background -mt-14 h-28 w-28 text-4xl shadow-lg ring-8 sm:-mt-16 sm:h-32 sm:w-32"
                    />
                    <div className="pb-1">
                      <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
                        {writer.pen_name}
                      </h1>
                      <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-sm font-medium">
                        <AtSign className="h-3.5 w-3.5" />
                        {writer.handle}
                      </p>
                    </div>
                  </div>
                  {isOwner && (
                    <Link
                      href="/write/profile"
                      className="bg-card border-border text-foreground hover:bg-muted inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
                    >
                      <PenLine className="h-4 w-4" />
                      Edit profile
                    </Link>
                  )}
                </div>

                {writer.tagline && (
                  <p className="text-foreground/85 mt-5 px-2 font-serif text-xl sm:px-8">
                    {writer.tagline}
                  </p>
                )}

                <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-2 text-sm sm:px-8">
                  {writer.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {writer.location}
                    </span>
                  )}
                  {writer.writer_since && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      Writing since{" "}
                      {new Date(writer.writer_since).toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {FEATURES.profileLinks && writer.website && (
                    <a
                      href={writer.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-primary flex items-center gap-1.5 font-semibold hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      {prettyUrl(writer.website)}
                    </a>
                  )}
                  {FEATURES.profileLinks &&
                    writer.social_links.map((link) => (
                      <a
                        key={link.platform}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="hover:text-foreground bg-muted flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        {platformLabel(link.platform)}
                      </a>
                    ))}
                </div>
              </section>

              <div className="mt-10 grid items-start gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
                {/* About */}
                <aside className="space-y-4 lg:sticky lg:top-24">
                  <div className="mb-5 flex h-8 items-baseline">
                    <h2 className="text-foreground text-2xl font-extrabold tracking-tight">
                      About
                    </h2>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "Stories",
                        value: writer.stats.stories,
                        icon: BookOpen,
                        tone: "bg-lavender text-lavender-ink",
                      },
                      {
                        label: "Scenes",
                        value: writer.stats.scenes,
                        icon: Layers,
                        tone: "bg-sky text-sky-ink",
                      },
                      {
                        label: "Choices",
                        value: writer.stats.choices,
                        icon: Split,
                        tone: "bg-mint text-mint-ink",
                      },
                    ].map(({ label, value, icon: Icon, tone: t }) => (
                      <div
                        key={label}
                        className="bg-card border-border rounded-2xl border p-3 text-center shadow-sm"
                      >
                        <span
                          className={cn(
                            "mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl",
                            t,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="text-foreground text-xl font-extrabold tabular-nums">
                          {value}
                        </p>
                        <p className="text-muted-foreground text-[11px] font-semibold">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-card border-border rounded-3xl border p-6 shadow-sm">
                    <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-line">
                      {writer.bio || `${writer.pen_name} hasn't written a bio yet.`}
                    </p>
                    {writer.genres.length > 0 && (
                      <>
                        <p className="text-muted-foreground mt-5 mb-2 text-xs font-bold tracking-wide uppercase">
                          Writes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {writer.genres.map((g) => (
                            <span
                              key={g}
                              className="bg-lavender text-lavender-ink rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </aside>

                {/* Stories */}
                <section>
                  <div className="mb-5 flex h-8 items-baseline justify-between">
                    <h2 className="text-foreground text-2xl font-extrabold tracking-tight">
                      Stories
                    </h2>
                    <span className="text-muted-foreground text-sm">
                      {writer.stats.stories} published
                    </span>
                  </div>
                  {writer.stories.length === 0 ? (
                    <div className="bg-card border-border flex flex-col items-center gap-2 rounded-3xl border border-dashed py-16 text-center">
                      <div className="bg-peach flex h-12 w-12 items-center justify-center rounded-2xl">
                        <BookOpen className="text-peach-ink h-6 w-6" />
                      </div>
                      <p className="text-foreground font-bold">No published stories yet</p>
                      <p className="text-muted-foreground text-sm">Check back soon.</p>
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2">
                      {writer.stories.map((story) => (
                        <PublicStoryCard key={story.id} story={story} showAuthor={false} />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </PageContainer>
      </main>

      <ReaderFooter />
    </div>
  )
}
