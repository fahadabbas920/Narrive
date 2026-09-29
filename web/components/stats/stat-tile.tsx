import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

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
  /** A number is compacted and can show a delta; a string (e.g. "67%") is shown as is. */
  value: number | string
  previous?: number | null
  period?: string
  hint?: string
}) {
  const delta = previous == null || typeof value !== "number" ? null : value - previous
  return (
    <div className="bg-card border-border rounded-2xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      <p className="text-foreground mt-1.5 text-2xl font-extrabold tracking-tight">
        {typeof value === "number" ? formatCount(value) : value}
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
