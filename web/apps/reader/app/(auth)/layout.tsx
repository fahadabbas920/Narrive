import Link from "next/link"
import { ArrowLeft, BookOpen } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Left panel — jade gradient */}
      <div className="from-primary via-primary/80 to-accent relative hidden flex-1 flex-col justify-end bg-linear-to-br p-12 lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 space-y-4">
          <blockquote className="max-w-sm text-xl leading-relaxed font-medium text-white/90">
            &ldquo;Every choice is a new story. Every ending is just another beginning.&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Narrive</p>
              <p className="font-mono text-[11px] tracking-widest text-white/60 uppercase">
                Interactive Fiction Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="bg-background relative flex w-full shrink-0 flex-col items-center justify-center px-8 lg:w-xl">
        <Link
          href="/"
          className="text-muted-foreground hover:text-primary absolute top-6 left-6 flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Browse stories
        </Link>
        <div className="relative z-10 w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
