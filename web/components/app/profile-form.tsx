"use client"

import Link from "next/link"
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowRight,
  AtSign,
  Check,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Palette,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import type { UserRead } from "@/lib/api/auth"
import { useTaxonomy } from "@/hooks/use-taxonomy"
import { useHandleAvailability, useUpdateProfile } from "@/hooks/use-profile"
import { TONES, tone, type Tone } from "@/lib/tones"
import { cn } from "@/lib/utils"
import { FEATURES } from "@/lib/features"
import { WriterAvatar } from "@/components/writer-avatar"

const profileSchema = z.object({
  pen_name: z.string().trim().min(2, "At least 2 characters").max(60, "At most 60 characters"),
  handle: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .max(30, "At most 30 characters")
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Lowercase letters, numbers and hyphens only")
    .refine((v) => !v.includes("--"), "No double hyphens"),
  tagline: z.string().trim().max(80, "At most 80 characters"),
  bio: z.string().trim().max(600, "At most 600 characters"),
  location: z.string().trim().max(60, "At most 60 characters"),
  website: z.string().trim().max(200, "Too long"),
  genres: z.array(z.string()),
  social_links: z.array(
    z.object({ platform: z.string().min(1), url: z.string().trim().min(1, "Add the link") }),
  ),
  avatar_tone: z.string(),
  cover_tone: z.string(),
})

type ProfileData = z.infer<typeof profileSchema>

const field =
  "bg-muted text-foreground placeholder:text-muted-foreground/80 focus:bg-card focus:border-ring focus:ring-ring/40 w-full rounded-2xl border border-transparent px-4 outline-none transition-all focus:ring-4 aria-invalid:border-destructive/60"

function toFormValues(user: UserRead): ProfileData {
  return {
    pen_name: user.pen_name ?? "",
    handle: user.handle ?? "",
    tagline: user.tagline ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
    website: user.website ?? "",
    genres: user.genres ?? [],
    social_links: user.social_links ?? [],
    avatar_tone: user.avatar_tone,
    cover_tone: user.cover_tone,
  }
}

export function ProfileForm({ user }: { user: UserRead }) {
  const { data: taxonomy } = useTaxonomy()
  const { mutate: save, isPending } = useUpdateProfile()
  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(user),
    mode: "onTouched",
  })
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = form
  const socials = useFieldArray({ control, name: "social_links" })
  const handle = useWatch({ control, name: "handle" })
  const tagline = useWatch({ control, name: "tagline" })
  const bio = useWatch({ control, name: "bio" })
  const socialValues = useWatch({ control, name: "social_links" })
  const availability = useHandleAvailability(handle ?? "", user.handle)
  const handleBlocked = availability.enabled && availability.data?.available === false

  const limits = taxonomy?.limits
  const platforms = taxonomy?.social_platforms ?? []
  const usedPlatforms = new Set(socialValues?.map((l) => l.platform))
  const nextPlatform = platforms.find((p) => !usedPlatforms.has(p.value))

  function onSubmit(data: ProfileData) {
    if (handleBlocked) return
    save(
      {
        pen_name: data.pen_name,
        handle: data.handle,
        tagline: data.tagline || null,
        bio: data.bio || null,
        location: data.location || null,
        genres: data.genres,
        ...(FEATURES.profileLinks
          ? { website: data.website || null, social_links: data.social_links }
          : {}),
        avatar_tone: data.avatar_tone,
        cover_tone: data.cover_tone,
      },
      { onSuccess: (saved) => reset(toFormValues(saved)) },
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="space-y-6">
        <Section
          icon={AtSign}
          tone="bg-lavender text-lavender-ink"
          title="Identity"
          description="How readers find and recognise you."
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="pen_name"
                className="text-foreground mb-2 block text-sm font-semibold"
              >
                Pen name
              </label>
              <input
                id="pen_name"
                aria-invalid={!!errors.pen_name}
                className={cn(field, "h-12 text-base font-semibold")}
                {...register("pen_name")}
              />
              <FieldError message={errors.pen_name?.message} />
            </div>

            <div>
              <label htmlFor="handle" className="text-foreground mb-2 block text-sm font-semibold">
                Handle
              </label>
              <div className="bg-muted focus-within:bg-card focus-within:border-ring focus-within:ring-ring/40 flex h-12 items-center rounded-2xl border border-transparent pr-3 pl-4 transition-all focus-within:ring-4">
                <span className="text-muted-foreground shrink-0 text-sm">narrive.app/writers/</span>
                <Controller
                  control={control}
                  name="handle"
                  render={({ field: f }) => (
                    <input
                      id="handle"
                      value={f.value}
                      onChange={(e) =>
                        f.onChange(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                      }
                      onBlur={f.onBlur}
                      spellCheck={false}
                      autoCapitalize="off"
                      aria-invalid={!!errors.handle || handleBlocked}
                      aria-describedby="handle-status"
                      className="text-foreground min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                    />
                  )}
                />
                <HandleStatus
                  loading={
                    availability.enabled && (availability.settling || availability.isFetching)
                  }
                  available={availability.enabled ? availability.data?.available : undefined}
                />
              </div>
              <p
                id="handle-status"
                className={cn(
                  "mt-1.5 text-xs",
                  errors.handle || handleBlocked ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {errors.handle?.message ??
                  (handleBlocked
                    ? availability.data?.reason
                    : availability.enabled && availability.data?.available
                      ? "Nice — that handle is available."
                      : "Changing it breaks old links to your profile.")}
              </p>
            </div>

            <div>
              <Counter htmlFor="tagline" label="Tagline" count={tagline?.length ?? 0} max={80} />
              <input
                id="tagline"
                placeholder="Gentle mysteries with too many doors"
                aria-invalid={!!errors.tagline}
                className={cn(field, "h-12 text-sm")}
                {...register("tagline")}
              />
              <FieldError message={errors.tagline?.message} />
            </div>
          </div>
        </Section>

        <Section
          icon={FileText}
          tone="bg-peach text-peach-ink"
          title="About you"
          description="A little context for curious readers."
        >
          <div className="space-y-5">
            <div>
              <Counter
                htmlFor="bio"
                label="Bio"
                count={bio?.length ?? 0}
                max={limits?.bio_length ?? 600}
              />
              <textarea
                id="bio"
                rows={5}
                placeholder="What do you write, and why? Readers love a little backstory."
                aria-invalid={!!errors.bio}
                className={cn(field, "min-h-32 resize-y py-3 text-sm leading-relaxed")}
                {...register("bio")}
              />
              <FieldError message={errors.bio?.message} />
            </div>
            <div>
              <label
                htmlFor="location"
                className="text-foreground mb-2 block text-sm font-semibold"
              >
                Location <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="relative">
                <MapPin className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
                <input
                  id="location"
                  placeholder="Lahore, Pakistan"
                  aria-invalid={!!errors.location}
                  className={cn(field, "h-12 pl-10 text-sm")}
                  {...register("location")}
                />
              </div>
              <FieldError message={errors.location?.message} />
            </div>
            <GenrePicker
              control={control}
              genres={taxonomy?.genres}
              max={limits?.writer_genres ?? 5}
            />
          </div>
        </Section>

        <Section
          icon={Palette}
          tone="bg-mint text-mint-ink"
          title="Look & feel"
          description="Pick the colours for your avatar and profile cover."
        >
          <div className="space-y-6">
            <ToneField
              control={control}
              name="avatar_tone"
              label="Avatar"
              tones={taxonomy?.profile_tones}
              variant="avatar"
            />
            <ToneField
              control={control}
              name="cover_tone"
              label="Cover"
              tones={taxonomy?.profile_tones}
              variant="cover"
            />
          </div>
        </Section>

        {FEATURES.profileLinks ? (
          <Section
            icon={Link2}
            tone="bg-sky text-sky-ink"
            title="Links"
            description="Point readers to where else they can find you."
          >
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="website"
                  className="text-foreground mb-2 block text-sm font-semibold"
                >
                  Website
                </label>
                <div className="relative">
                  <Globe className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
                  <input
                    id="website"
                    inputMode="url"
                    placeholder="yourname.com"
                    aria-invalid={!!errors.website}
                    className={cn(field, "h-12 pl-10 text-sm")}
                    {...register("website")}
                  />
                </div>
                <FieldError message={errors.website?.message} />
              </div>

              <div>
                <p className="text-foreground mb-2 text-sm font-semibold">
                  Social links{" "}
                  <span className="text-muted-foreground font-normal">
                    (up to {limits?.social_links ?? 3})
                  </span>
                </p>
                <div className="space-y-2">
                  {socials.fields.map((item, index) => {
                    const current = socialValues?.[index]?.platform
                    const domain = platforms.find((p) => p.value === current)?.domain
                    return (
                      <div key={item.id} className="flex items-start gap-2">
                        <select
                          aria-label="Platform"
                          className={cn(
                            field,
                            "h-12 w-36 shrink-0 cursor-pointer px-3 text-sm font-semibold",
                          )}
                          {...register(`social_links.${index}.platform`)}
                        >
                          {platforms.map((p) => (
                            <option
                              key={p.value}
                              value={p.value}
                              disabled={p.value !== current && usedPlatforms.has(p.value)}
                            >
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <div className="min-w-0 flex-1">
                          <input
                            inputMode="url"
                            placeholder={domain ? `${domain}/yourname` : "Link"}
                            aria-label="Profile link"
                            aria-invalid={!!errors.social_links?.[index]?.url}
                            className={cn(field, "h-12 text-sm")}
                            {...register(`social_links.${index}.url`)}
                          />
                          <FieldError message={errors.social_links?.[index]?.url?.message} />
                        </div>
                        <button
                          type="button"
                          onClick={() => socials.remove(index)}
                          aria-label="Remove link"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                {socials.fields.length < (limits?.social_links ?? 3) ? (
                  <button
                    type="button"
                    disabled={!nextPlatform}
                    onClick={() =>
                      nextPlatform && socials.append({ platform: nextPlatform.value, url: "" })
                    }
                    className="text-primary hover:bg-lavender/50 mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {socials.fields.length === 0 ? "Add a link" : "Add another link"}
                  </button>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs">
                    You&apos;ve added the maximum of {limits?.social_links ?? 3} links.
                  </p>
                )}
              </div>
            </div>
          </Section>
        ) : (
          <LockedSection
            icon={Link2}
            title="Links"
            description="Point readers to your website and socials."
          />
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6">
        <ProfilePreview control={control} />
        <button
          type="submit"
          disabled={isPending || !isDirty || handleBlocked}
          className="from-lavender via-sky to-mint text-foreground group flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-linear-to-r text-base font-bold shadow-md ring-1 ring-black/5 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isPending ? "Saving…" : isDirty ? "Save profile" : "All changes saved"}
          <span className="bg-card flex h-8 w-8 items-center justify-center rounded-full shadow-sm">
            {isPending ? (
              <Loader2 className="text-lavender-ink h-4 w-4 animate-spin" />
            ) : isDirty ? (
              <ArrowRight className="text-lavender-ink h-4 w-4" />
            ) : (
              <Check className="text-mint-ink h-4 w-4" />
            )}
          </span>
        </button>
        {user.handle && (
          <Link
            href={`/writers/${user.handle}`}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-semibold transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View public profile
          </Link>
        )}
      </aside>
    </form>
  )
}

function Section({
  icon: Icon,
  tone: t,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-card border-border rounded-3xl border p-6 shadow-sm sm:p-7">
      <div className="mb-6 flex items-start gap-3.5">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t)}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-foreground font-bold">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function LockedSection({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="bg-card border-border relative overflow-hidden rounded-3xl border border-dashed p-6 sm:p-7">
      <div className="mb-6 flex items-start gap-3.5 opacity-60">
        <span className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-foreground flex items-center gap-2 font-bold">
            {title}
            <span className="bg-butter text-butter-ink rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
              Coming soon
            </span>
          </h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>

      {/* Ghosted fields hint at what's coming */}
      <div
        aria-hidden
        className="pointer-events-none space-y-3 opacity-40 blur-[1.5px] select-none"
      >
        <div className="bg-muted h-12 rounded-2xl" />
        <div className="flex gap-2">
          <div className="bg-muted h-12 w-36 rounded-2xl" />
          <div className="bg-muted h-12 flex-1 rounded-2xl" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-6 flex justify-center sm:bottom-7">
        <span className="bg-card border-border text-foreground flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-md">
          <Lock className="text-muted-foreground h-4 w-4" />
          Links are locked for now
        </span>
      </div>
    </div>
  )
}

function Counter({
  htmlFor,
  label,
  count,
  max,
}: {
  htmlFor: string
  label: string
  count: number
  max: number
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-foreground text-sm font-semibold">
        {label}
      </label>
      <span
        className={cn(
          "text-xs tabular-nums",
          count > max ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {count}/{max}
      </span>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-destructive mt-1.5 text-xs">{message}</p>
}

function HandleStatus({
  loading,
  available,
}: {
  loading: boolean
  available: boolean | undefined
}) {
  if (loading) return <Loader2 className="text-muted-foreground h-4 w-4 shrink-0 animate-spin" />
  if (available === true)
    return (
      <span className="bg-mint text-mint-ink flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
        <Check className="h-3.5 w-3.5" />
      </span>
    )
  if (available === false)
    return (
      <span className="bg-destructive/10 text-destructive flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
        <X className="h-3.5 w-3.5" />
      </span>
    )
  return null
}

function GenrePicker({
  control,
  genres,
  max,
}: {
  control: Control<ProfileData>
  genres: string[] | undefined
  max: number
}) {
  return (
    <Controller
      control={control}
      name="genres"
      render={({ field: f }) => (
        <div>
          <p className="text-foreground mb-3 text-sm font-semibold">
            Genres you write{" "}
            <span className="text-muted-foreground font-normal">(up to {max})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {!genres &&
              Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="bg-muted h-8 w-24 animate-pulse rounded-full" />
              ))}
            {genres?.map((g) => {
              const active = f.value.includes(g)
              const full = !active && f.value.length >= max
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={active}
                  disabled={full}
                  onClick={() =>
                    f.onChange(active ? f.value.filter((v) => v !== g) : [...f.value, g])
                  }
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                    active
                      ? "bg-lavender text-lavender-ink border-lavender-ink/30 font-semibold shadow-sm"
                      : "bg-background border-border text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                  {g}
                </button>
              )
            })}
          </div>
        </div>
      )}
    />
  )
}

function ToneField({
  control,
  name,
  label,
  tones,
  variant,
}: {
  control: Control<ProfileData>
  name: "avatar_tone" | "cover_tone"
  label: string
  tones: string[] | undefined
  variant: "avatar" | "cover"
}) {
  const penName = useWatch({ control, name: "pen_name" })
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => (
        <div>
          <p className="text-foreground mb-3 text-sm font-semibold">{label}</p>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={`${label} colour`}>
            {(tones ?? (Object.keys(TONES) as Tone[])).map((name) => {
              const t = tone(name)
              const selected = f.value === name
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={name}
                  title={name}
                  onClick={() => f.onChange(name)}
                  className={cn(
                    "relative cursor-pointer transition-all hover:scale-105",
                    variant === "avatar" ? "rounded-full" : "rounded-2xl",
                    selected && "ring-foreground/70 ring-offset-card ring-2 ring-offset-2",
                  )}
                >
                  {variant === "avatar" ? (
                    <WriterAvatar name={penName} toneName={name} className="h-12 w-12 text-base" />
                  ) : (
                    <span className={cn("block h-12 w-20 rounded-2xl bg-linear-to-br", t.cover)} />
                  )}
                  {selected && (
                    <span className="bg-foreground text-background absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    />
  )
}

function ProfilePreview({ control }: { control: Control<ProfileData> }) {
  const v = useWatch({ control })
  const name = v.pen_name?.trim() || "Your pen name"
  return (
    <div className="bg-card border-border shadow-lavender-ink/5 overflow-hidden rounded-3xl border shadow-xl">
      <div
        className={cn("relative h-20 overflow-hidden bg-linear-to-br", tone(v.cover_tone).cover)}
      >
        <div className="bg-card/35 absolute -right-4 -bottom-8 h-20 w-20 rotate-12 rounded-2xl" />
        <span className="bg-card/85 text-foreground/70 absolute top-3 left-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.2em] uppercase backdrop-blur-sm">
          Preview
        </span>
      </div>
      <div className="relative px-5 pb-5">
        <WriterAvatar
          name={name}
          toneName={v.avatar_tone}
          className="ring-card -mt-8 h-16 w-16 text-xl ring-4"
        />
        <p className="text-foreground mt-2 truncate text-lg font-extrabold">{name}</p>
        <p className="text-muted-foreground truncate text-xs">@{v.handle || "handle"}</p>
        {v.tagline?.trim() && (
          <p className="text-foreground/80 mt-2 font-serif text-sm">{v.tagline}</p>
        )}
        {v.location?.trim() && (
          <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            {v.location}
          </p>
        )}
        {(v.genres?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {v.genres?.map((g) => (
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
    </div>
  )
}
