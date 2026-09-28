"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useSignIn } from "@/hooks/use-auth"
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth"
import { ButtonUI } from "@workspace/ui/components/button-ui"

export function LoginForm({ next }: { next?: string }) {
  const { mutate: signin, isPending } = useSignIn(next)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  return (
    <form onSubmit={handleSubmit((data) => signin(data))} className="space-y-4">
      <div className="space-y-1.5">
        <Label
          htmlFor="email"
          className="text-muted-foreground font-mono text-xs tracking-widest uppercase"
        >
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          className="h-auto py-2.5"
          {...register("email")}
        />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="password"
          className="text-muted-foreground font-mono text-xs tracking-widest uppercase"
        >
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          className="h-auto py-2.5"
          {...register("password")}
        />
        {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
      </div>

      <ButtonUI type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign In"}
      </ButtonUI>
    </form>
  )
}
