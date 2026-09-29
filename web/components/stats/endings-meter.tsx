import { cn } from "@/lib/utils"

/** "2 of 4 endings" as dots and a label. Past 8 endings only the label is shown. */
export function EndingsMeter({
  found,
  total,
  className,
  showLabel = true,
}: {
  found: number
  total: number
  className?: string
  showLabel?: boolean
}) {
  if (total <= 0) return null
  const shown = Math.min(found, total)
  const label = `${shown} of ${total} ending${total === 1 ? "" : "s"}`
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={label}>
      {total <= 8 && (
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn("h-1.5 w-1.5 rounded-full", i < shown ? "bg-primary" : "bg-border")}
            />
          ))}
        </span>
      )}
      {showLabel ? (
        <span className="text-muted-foreground text-[11px] font-semibold">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  )
}
