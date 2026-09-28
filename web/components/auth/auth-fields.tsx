"use client"

import { forwardRef, useState } from "react"
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AuthMode } from "@/hooks/use-auth"

type InputProps = React.ComponentProps<"input"> & {
  label: string
  error?: string
  hint?: string
}

const inputBase =
  "bg-muted text-foreground placeholder:text-muted-foreground/80 focus:bg-card focus:ring-ring/50 h-14 w-full rounded-2xl border border-transparent pr-12 pl-4 text-[15px] outline-none transition-all focus:border-ring focus:ring-4 aria-invalid:border-destructive/60"

export const AuthInput = forwardRef<HTMLInputElement, InputProps>(function AuthInput(
  { label, error, hint, type, id, className, ...props },
  ref,
) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === "password"
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-foreground block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(inputBase, className)}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            {revealed ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        ) : (
          <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 h-4.5 w-4.5 -translate-y-1/2" />
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
})

const SUBMIT_TONE: Record<AuthMode, { bg: string; ink: string }> = {
  reader: { bg: "from-peach via-blush to-blush", ink: "text-blush-ink" },
  writer: { bg: "from-lavender via-sky to-sky", ink: "text-lavender-ink" },
}

export function AuthSubmit({
  mode,
  pending,
  children,
}: {
  mode: AuthMode
  pending: boolean
  children: React.ReactNode
}) {
  const tone = SUBMIT_TONE[mode]
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "text-foreground group flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-linear-to-r text-base font-bold shadow-md ring-1 ring-black/5 transition-all hover:shadow-lg disabled:cursor-wait disabled:opacity-70",
        tone.bg,
      )}
    >
      {children}
      <span className="bg-card flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-transform group-enabled:group-hover:translate-x-0.5">
        {pending ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", tone.ink)} />
        ) : (
          <ArrowRight className={cn("h-4 w-4", tone.ink)} />
        )}
      </span>
    </button>
  )
}
