import { BookOpen } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Left panel — teal gradient */}
      <div className="relative hidden flex-1 flex-col justify-end bg-linear-to-br from-primary via-primary/80 to-accent p-12 lg:flex">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
        <div className="relative z-10 space-y-4">
          <blockquote className="text-white/90 text-xl leading-relaxed max-w-sm font-medium">
            &ldquo;Every choice is a new story. Every ending is just another beginning.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3 mt-8">
            <div className="bg-white/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl backdrop-blur-sm">
              <BookOpen className="text-white h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Narrive</p>
              <p className="font-mono text-[11px] text-white/60 tracking-widest uppercase">
                Interactive Fiction Platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="relative flex w-full shrink-0 items-center justify-center bg-background px-8 lg:w-xl">
        <div className="relative z-10 w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
