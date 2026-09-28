"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Feather,
  GitBranch,
  Globe,
  Loader2,
  Repeat,
} from "lucide-react"
import { BadgePicker } from "@/components/ui/badge-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/brand"
import { ThemeToggle } from "@/components/theme-toggle"
import { useBecomeWriter, useMe } from "@/hooks/use-auth"
import { useTaxonomy } from "@/hooks/use-taxonomy"
import { writerProfileSchema, type WriterProfileData } from "@/lib/schemas/writer"

const STEPS = ["Welcome", "What you get", "Your profile", "Confirm"] as const

export function BecomeWriterFlow({ initialStep = 0 }: { initialStep?: number }) {
  const router = useRouter()
  const { data: me } = useMe()
  const [step, setStep] = useState(initialStep)
  const [accepted, setAccepted] = useState(false)
  const { mutate: becomeWriter, isPending } = useBecomeWriter()
  const { data: taxonomy } = useTaxonomy()
  const maxGenres = taxonomy?.limits.writer_genres ?? 5

  const form = useForm<WriterProfileData>({
    resolver: zodResolver(writerProfileSchema),
    defaultValues: { pen_name: "", bio: "", genres: [] },
    mode: "onTouched",
  })
  const values = form.watch()

  const submitted = useRef(false)

  // Existing writers have nothing to do here. After our own submit, useBecomeWriter navigates.
  useEffect(() => {
    if (me?.is_writer && !submitted.current) router.replace("/write")
  }, [me, router])

  async function next() {
    if (step === 2 && !(await form.trigger())) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function submit() {
    if (!accepted) return
    const { pen_name, bio, genres } = writerProfileSchema.parse(form.getValues())
    submitted.current = true
    becomeWriter({ pen_name, bio, genres, accepted_terms: true })
  }

  function toggleGenre(genre: string) {
    const current = form.getValues("genres")
    const nextGenres = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : current.length < maxGenres
        ? [...current, genre]
        : current
    form.setValue("genres", nextGenres, { shouldValidate: true })
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden">
      {/* Soft pastel backdrop */}
      <div className="from-lavender/70 via-background to-peach/60 absolute inset-0 -z-10 bg-linear-to-br" />
      <div className="bg-sky/70 absolute -top-32 -left-24 -z-10 h-96 w-96 rounded-full blur-3xl" />
      <div className="bg-blush/70 absolute -right-24 -bottom-32 -z-10 h-96 w-96 rounded-full blur-3xl" />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <span className="text-foreground font-bold tracking-tight">Narrive</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to reading
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-2 pb-12 sm:items-center sm:px-6">
        <div className="w-full max-w-2xl">
          <StepIndicator step={step} />

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (step < STEPS.length - 1) void next()
              else submit()
            }}
            className="bg-card/90 border-border shadow-lavender-ink/5 mt-6 rounded-[2rem] border p-6 shadow-xl backdrop-blur-sm sm:p-10"
          >
            <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
              {step === 0 && <WelcomeStep />}
              {step === 1 && <BenefitsStep />}
              {step === 2 && (
                <ProfileStep
                  form={form}
                  values={values}
                  genres={taxonomy?.genres ?? []}
                  maxGenres={maxGenres}
                  onToggleGenre={toggleGenre}
                />
              )}
              {step === 3 && (
                <ConfirmStep
                  values={values}
                  accepted={accepted}
                  onAcceptedChange={setAccepted}
                  onEdit={() => setStep(2)}
                />
              )}
            </div>

            <div className="border-border mt-8 flex items-center justify-between gap-3 border-t pt-6">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <span />
              )}

              <button
                type="submit"
                disabled={(step === 3 && !accepted) || isPending}
                className="from-lavender via-sky to-mint text-foreground group flex cursor-pointer items-center gap-3 rounded-full bg-linear-to-r py-2 pr-2 pl-6 text-sm font-bold shadow-md ring-1 ring-black/5 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {step === 0
                  ? "Let's begin"
                  : step === 3
                    ? isPending
                      ? "Setting up your desk…"
                      : "Create writer profile"
                    : "Continue"}
                <span className="bg-card flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-transform group-enabled:group-hover:translate-x-0.5">
                  {isPending ? (
                    <Loader2 className="text-lavender-ink h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="text-lavender-ink h-4 w-4" />
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < step
        const current = i === step
        return (
          <li key={label} className="flex flex-1 flex-col gap-2">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                done || current ? "from-lavender-ink/70 to-sky-ink/60 bg-linear-to-r" : "bg-border",
              )}
            />
            <span
              aria-current={current ? "step" : undefined}
              className={cn(
                "hidden items-center gap-1 text-xs font-semibold sm:flex",
                current ? "text-foreground" : done ? "text-lavender-ink" : "text-muted-foreground",
              )}
            >
              {done && <Check className="h-3 w-3" />}
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function StepHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-lavender-ink font-mono text-[11px] font-medium tracking-[0.2em] uppercase">
        {eyebrow}
      </p>
      <h1 className="text-foreground text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
        {title}
      </h1>
      {children && <p className="text-muted-foreground leading-relaxed">{children}</p>}
    </div>
  )
}

function WelcomeStep() {
  return (
    <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:text-left">
      <div className="relative h-36 w-36 shrink-0">
        <div className="bg-peach absolute top-0 left-2 flex h-20 w-20 -rotate-12 items-center justify-center rounded-3xl shadow-sm">
          <BookOpen className="text-peach-ink h-8 w-8" />
        </div>
        <div className="bg-lavender absolute right-0 bottom-6 flex h-20 w-20 rotate-6 items-center justify-center rounded-3xl shadow-sm">
          <Feather className="text-lavender-ink h-8 w-8" />
        </div>
        <div className="bg-mint absolute bottom-0 left-6 flex h-12 w-12 rotate-12 items-center justify-center rounded-2xl shadow-sm">
          <GitBranch className="text-mint-ink h-5 w-5" />
        </div>
      </div>
      <StepHeading eyebrow="Welcome, storyteller" title="Every story starts with a choice.">
        You&apos;ve been exploring stories on Narrive — now it&apos;s your turn. Write a story where
        readers decide what happens next. It only takes a minute to set up.
      </StepHeading>
    </div>
  )
}

const BENEFITS = [
  {
    icon: GitBranch,
    tone: "bg-lavender text-lavender-ink",
    title: "Visual branching editor",
    body: "Map scenes and choices on a canvas. Drag, connect, and see the whole story at a glance.",
  },
  {
    icon: Globe,
    tone: "bg-mint text-mint-ink",
    title: "Publish to readers",
    body: "Share your story with the Narrive community the moment it's ready.",
  },
  {
    icon: BarChart3,
    tone: "bg-peach text-peach-ink",
    title: "Reader insights",
    body: "See which paths readers take and where they find each ending.",
    soon: true,
  },
]

function BenefitsStep() {
  return (
    <div className="space-y-6">
      <StepHeading eyebrow="Your writing desk" title="Here's what you get" />
      <div className="grid gap-3 sm:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, tone, title, body, soon }) => (
          <div key={title} className="bg-background border-border rounded-2xl border p-4">
            <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", tone)}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-foreground flex flex-wrap items-center gap-1.5 text-sm font-bold">
              {title}
              {soon && (
                <span className="bg-butter text-butter-ink rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Soon
                </span>
              )}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <div className="bg-sky text-sky-ink flex items-start gap-3 rounded-2xl p-4 text-sm">
        <Repeat className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-bold">You keep reading, too.</span> It&apos;s the same account —
          switch between Reading and Writing from the top bar anytime.
        </p>
      </div>
    </div>
  )
}

function ProfileStep({
  form,
  values,
  genres,
  maxGenres,
  onToggleGenre,
}: {
  form: ReturnType<typeof useForm<WriterProfileData>>
  values: WriterProfileData
  genres: string[]
  maxGenres: number
  onToggleGenre: (genre: string) => void
}) {
  const { errors } = form.formState
  const fieldLabel = "text-foreground mb-2 block text-sm font-semibold"
  const inputClass = "bg-muted h-12 rounded-xl border-transparent px-4 text-sm"

  return (
    <div className="space-y-6">
      <StepHeading eyebrow="Step 3 of 4" title="Create your writer profile">
        This is how readers will know you. You can change it later.
      </StepHeading>

      <div className="grid gap-6 sm:grid-cols-[1fr_200px]">
        <div className="space-y-5">
          <div>
            <label htmlFor="pen_name" className={fieldLabel}>
              Pen name
            </label>
            <Input
              id="pen_name"
              autoFocus
              autoComplete="nickname"
              placeholder="e.g. Ada Quill"
              aria-invalid={!!errors.pen_name}
              className={inputClass}
              {...form.register("pen_name")}
            />
            {errors.pen_name && (
              <p className="text-destructive mt-1.5 text-xs">{errors.pen_name.message}</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="bio" className="text-foreground text-sm font-semibold">
                Short bio <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  values.bio.length > 280 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {values.bio.length}/280
              </span>
            </div>
            <Textarea
              id="bio"
              rows={3}
              placeholder="A line or two about you and the stories you like to tell."
              aria-invalid={!!errors.bio}
              className="bg-muted min-h-24 rounded-xl border-transparent px-4 py-3 text-sm"
              {...form.register("bio")}
            />
            {errors.bio && <p className="text-destructive mt-1.5 text-xs">{errors.bio.message}</p>}
          </div>

          <div>
            <p className={fieldLabel}>
              Genres you write{" "}
              <span className="text-muted-foreground font-normal">(up to {maxGenres})</span>
            </p>
            <BadgePicker items={genres} selected={values.genres} onToggle={onToggleGenre} />
          </div>
        </div>

        {/* Live byline preview */}
        <div className="hidden sm:block">
          <p className="text-muted-foreground mb-2 text-xs font-semibold">Readers will see</p>
          <BylineCard values={values} />
        </div>
      </div>
    </div>
  )
}

function BylineCard({ values }: { values: WriterProfileData }) {
  const name = values.pen_name.trim() || "Your pen name"
  return (
    <div className="bg-background border-border rounded-2xl border p-4">
      <div className="from-peach via-blush to-lavender text-lavender-ink mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br text-base font-extrabold">
        {name[0]?.toUpperCase()}
      </div>
      <p
        className={cn(
          "truncate text-sm font-bold",
          values.pen_name.trim() ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {name}
      </p>
      <p className="text-muted-foreground mt-1 line-clamp-3 text-xs leading-relaxed">
        {values.bio.trim() || "Your bio will appear here."}
      </p>
      {values.genres.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {values.genres.map((g) => (
            <span
              key={g}
              className="bg-lavender text-lavender-ink rounded-full px-2 py-0.5 text-[10px] font-semibold"
            >
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfirmStep({
  values,
  accepted,
  onAcceptedChange,
  onEdit,
}: {
  values: WriterProfileData
  accepted: boolean
  onAcceptedChange: (v: boolean) => void
  onEdit: () => void
}) {
  return (
    <div className="space-y-6">
      <StepHeading eyebrow="Almost there" title="Ready to start writing?">
        Check your profile, then confirm to open your writing desk.
      </StepHeading>

      <div className="flex items-start gap-4">
        <div className="flex-1">
          <BylineCard values={values} />
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-primary shrink-0 cursor-pointer text-sm font-semibold hover:underline"
        >
          Edit
        </button>
      </div>

      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
          accepted ? "border-mint-ink/30 bg-mint/60" : "border-border bg-background hover:bg-muted",
        )}
      >
        <Checkbox
          checked={accepted}
          onCheckedChange={(checked) => onAcceptedChange(checked)}
          className="mt-0.5 size-5 rounded-md"
        />
        <span className="text-foreground text-sm leading-relaxed">
          I agree to the Narrive community guidelines and understand that stories I publish are
          public for anyone to read.
        </span>
      </label>
    </div>
  )
}
