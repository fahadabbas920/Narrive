import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "../lib/utils"

interface PageHeaderProps {
  title: string
  subtitle: string
  backHref?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, backHref, action, className }: PageHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between px-6 py-4", className)}>
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div>
          <p className="text-foreground font-semibold">{title}</p>
          <p className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
            {subtitle}
          </p>
        </div>
      </div>
      {action && <div>{action}</div>}
    </header>
  )
}
