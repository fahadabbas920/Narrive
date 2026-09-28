import { cn } from "@/lib/utils"
import { tone } from "@/lib/tones"

export function WriterAvatar({
  name,
  toneName,
  className,
}: {
  name: string | null | undefined
  toneName: string | null | undefined
  className?: string
}) {
  const t = tone(toneName)
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-extrabold select-none",
        t.fill,
        t.ink,
        className,
      )}
    >
      {(name?.trim()[0] ?? "?").toUpperCase()}
    </span>
  )
}
