"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthInput, AuthSubmit } from "@/components/auth/auth-fields"
import { useSignUp, type AuthMode } from "@/hooks/use-auth"
import { registerSchema, type RegisterFormData } from "@/lib/schemas/auth"

export function RegisterForm({ mode, next }: { mode: AuthMode; next?: string }) {
  const { mutate: signup, isPending } = useSignUp({ mode, next })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  return (
    <form onSubmit={handleSubmit((data) => signup(data))} className="space-y-5" noValidate>
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
        autoComplete="new-password"
        placeholder="Create a password"
        hint="8+ characters, with at least one letter and one number."
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="pt-1">
        <AuthSubmit mode={mode} pending={isPending}>
          {isPending
            ? "Creating account…"
            : mode === "writer"
              ? "Create account & continue"
              : "Create account"}
        </AuthSubmit>
      </div>
    </form>
  )
}
