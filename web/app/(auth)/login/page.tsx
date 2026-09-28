import { AuthShell } from "@/components/auth/auth-shell"
import { resolveAuthParams } from "@/lib/auth-mode"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>
}) {
  const { mode, next } = resolveAuthParams(await searchParams)
  return <AuthShell kind="login" initialMode={mode} next={next} />
}
