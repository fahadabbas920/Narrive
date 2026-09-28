"use client"

import { useMe } from "@/hooks/use-auth"
import { ProfileForm } from "@/components/app/profile-form"

export default function WriterProfileSettingsPage() {
  const { data: me, isLoading } = useMe()

  return (
    <div className="flex-1 px-4 pt-8 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-lavender-ink font-mono text-[11px] font-medium tracking-[0.2em] uppercase">
          Writing desk
        </p>
        <h1 className="text-foreground mt-1 text-3xl font-extrabold tracking-tight">
          Your profile
        </h1>
        <p className="text-muted-foreground mt-1">
          This is your public page — readers see it when they tap your name on a story.
        </p>

        {isLoading || !me ? (
          <div className="mt-8 grid animate-pulse gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <div className="bg-muted h-72 rounded-3xl" />
              <div className="bg-muted h-56 rounded-3xl" />
            </div>
            <div className="bg-muted h-80 rounded-3xl" />
          </div>
        ) : (
          <ProfileForm key={me.updated_at} user={me} />
        )}
      </div>
    </div>
  )
}
