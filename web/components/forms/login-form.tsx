"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthInput, AuthSubmit } from "@/components/auth/auth-fields"
import { useSignIn, type AuthMode } from "@/hooks/use-auth"
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth"

export function LoginForm({ mode, next }: { mode: AuthMode; next?: string }) {
  const { mutate: signin, isPending } = useSignIn({ mode, next })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  return (
    <form onSubmit={handleSubmit((data) => signin(data))} className="space-y-5" noValidate>
      <AuthInput
        id="email"
        type="email"
        label="Email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <AuthInput
        id="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="pt-1">
        <AuthSubmit mode={mode} pending={isPending}>
          {isPending ? "Logging in…" : "Log in"}
        </AuthSubmit>
      </div>
    </form>
  )
}
