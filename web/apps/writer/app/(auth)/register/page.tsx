import Link from "next/link"
import { BookOpen } from "lucide-react"
import { RegisterForm } from "@/components/forms/register-form"

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="bg-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-md lg:hidden">
          <BookOpen className="text-primary-foreground h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="text-foreground text-2xl font-semibold">Create account</p>
          <p className="text-primary mt-0.5 font-mono text-[11px] tracking-widest uppercase">
            Narrive
          </p>
        </div>
      </div>

      <RegisterForm />

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
