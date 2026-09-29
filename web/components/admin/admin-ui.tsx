"use client"

import { useEffect, useState } from "react"
import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react"
import type { StoryStatus } from "@/lib/api/stories"
import { cn } from "@/lib/utils"

export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Panel({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("bg-card border-border rounded-3xl border p-5 shadow-sm", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-foreground text-sm font-bold">{title}</h2>}
            {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })
export const formatCount = (n: number) => (n < 10_000 ? n.toLocaleString() : compact.format(n))

export function StatTile({
  label,
  value,
  previous,
  period,
  hint,
}: {
  label: string
  value: number
  previous?: number | null
  period?: string
  hint?: string
}) {
  const delta = previous == null ? null : value - previous
  return (
    <div className="bg-card border-border rounded-2xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      <p className="text-foreground mt-1.5 text-2xl font-extrabold tracking-tight">
        {formatCount(value)}
      </p>
      {delta !== null ? (
        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-bold",
              delta > 0 ? "text-mint-ink" : delta < 0 ? "text-destructive" : "",
            )}
          >
            {delta > 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            ) : delta < 0 ? (
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
            ) : null}
            {delta > 0 ? "+" : ""}
            {delta.toLocaleString()}
          </span>
          vs {period}
        </p>
      ) : (
        hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      )}
    </div>
  )
}

export function StatusBadge({ status }: { status: StoryStatus }) {
  const map = {
    published: { cls: "bg-mint text-mint-ink", icon: Globe, label: "Published" },
    draft: { cls: "bg-butter text-butter-ink", icon: Clock, label: "Draft" },
    archived: { cls: "bg-muted text-muted-foreground", icon: Archive, label: "Archived" },
  }[status]
  const Icon = map.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap",
        map.cls,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {map.label}
    </span>
  )
}

export function OriginalBadge() {
  return (
    <span className="bg-peach text-peach-ink inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap">
      <Sparkles className="h-3 w-3" aria-hidden />
      Original
    </span>
  )
}

export function FeaturedBadge({ rank }: { rank?: number | null }) {
  return (
    <span className="bg-sky text-sky-ink inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap">
      <Star className="h-3 w-3" aria-hidden />
      Featured{rank != null ? ` #${rank}` : ""}
    </span>
  )
}

export function AccountBadges({
  isActive,
  isWriter,
  adminRole,
}: {
  isActive: boolean
  isWriter: boolean
  adminRole: string | null
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {!isActive && (
        <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[11px] font-bold">
          Suspended
        </span>
      )}
      {adminRole && (
        <span className="bg-butter text-butter-ink inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Admin
        </span>
      )}
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-bold",
          isWriter ? "bg-lavender text-lavender-ink" : "bg-peach text-peach-ink",
        )}
      >
        {isWriter ? "Writer" : "Reader"}
      </span>
    </span>
  )
}

/** Search box that reports its value after the user pauses typing. */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    if (draft === value) return
    const t = setTimeout(() => onChange(draft), 300)
    return () => clearTimeout(t)
  }, [draft, value, onChange])

  return (
    <label className="bg-card border-border focus-within:border-primary/50 focus-within:ring-primary/15 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border px-4 shadow-sm transition-all focus-within:ring-4 sm:max-w-sm">
      <Search className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft("")
            onChange("")
          }}
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  )
}

export function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="bg-muted ring-border flex items-center rounded-full p-1 ring-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "cursor-pointer rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all",
            value === o.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const btn =
    "border-border text-foreground hover:bg-muted flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40"
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-xs">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-muted-foreground text-xs font-semibold tabular-nums">
          {page} / {pages}
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="bg-muted mb-1 flex h-12 w-12 items-center justify-center rounded-2xl">
        <Icon className="text-muted-foreground h-6 w-6" />
      </div>
      <p className="text-foreground font-bold">{title}</p>
      {children && <div className="text-muted-foreground max-w-sm text-sm">{children}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted animate-pulse rounded-xl", className)} />
}

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
      </div>
    </div>
  )
}

export const th =
  "text-muted-foreground border-border border-b px-4 py-3 text-[11px] font-bold tracking-wide whitespace-nowrap uppercase"
export const td = "border-border border-b px-4 py-3 align-middle"

/** Formats a naive-UTC backend timestamp as a local date. */
export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return "—"
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`)
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  })
}
