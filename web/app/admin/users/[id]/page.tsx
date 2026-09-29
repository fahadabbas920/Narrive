"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  PenLine,
  PenOff,
  ShieldAlert,
  UserCheck,
  UserX,
} from "lucide-react"
import { useAdminUser, useUpdateAdminUser } from "@/hooks/use-admin"
import { useMe } from "@/hooks/use-auth"
import {
  AccountBadges,
  AdminPage,
  EmptyState,
  Panel,
  Skeleton,
  formatDate,
} from "@/components/admin/admin-ui"
import { StoryTable } from "@/components/admin/story-table"
import { ConfirmDialog } from "@/components/app/confirm-dialog"
import { WriterAvatar } from "@/components/writer-avatar"
import { ReadingStatsPanel } from "@/components/stats/reading-stats-panel"

type Pending = { field: "is_active" | "is_writer"; value: boolean } | null

const COPY = {
  "is_active:false": {
    title: "Suspend this account?",
    body: "They're signed out on their next request and can't sign in again. Their published stories leave the catalogue until you reactivate them. Nothing is deleted.",
    label: "Suspend",
    icon: UserX,
    destructive: true,
  },
  "is_active:true": {
    title: "Reactivate this account?",
    body: "They can sign in again, and their published stories return to the catalogue.",
    label: "Reactivate",
    icon: UserCheck,
    destructive: false,
  },
  "is_writer:false": {
    title: "Remove writer access?",
    body: "They keep their reader account, but lose the writing desk and their published stories leave the catalogue. Their stories and profile are kept.",
    label: "Remove access",
    icon: PenOff,
    destructive: true,
  },
  "is_writer:true": {
    title: "Restore writer access?",
    body: "They get the writing desk back, and their published stories return to the catalogue.",
    label: "Restore access",
    icon: PenLine,
    destructive: false,
  },
} as const

export default function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: user, isLoading } = useAdminUser(id)
  const { data: me } = useMe()
  const update = useUpdateAdminUser(id)
  const [pending, setPending] = useState<Pending>(null)

  const back = (
    <Link
      href="/admin/users"
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm font-semibold"
    >
      <ArrowLeft className="h-4 w-4" />
      All users
    </Link>
  )

  if (isLoading) {
    return (
      <AdminPage title="User">
        <Skeleton className="h-48" />
      </AdminPage>
    )
  }
  if (!user) {
    return (
      <AdminPage title="User">
        {back}
        <EmptyState icon={UserX} title="User not found" />
      </AdminPage>
    )
  }

  const isSelf = me?.id === user.id
  const locked = isSelf || !!user.admin_role
  const copy = pending ? COPY[`${pending.field}:${pending.value}`] : null
  const name = user.pen_name ?? user.email.split("@")[0]

  return (
    <AdminPage title={name} description={user.email}>
      {back}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex flex-wrap items-start gap-4">
            <WriterAvatar name={name} toneName={user.avatar_tone} className="h-14 w-14 text-xl" />
            <div className="min-w-0 flex-1">
              <AccountBadges
                isActive={user.is_active}
                isWriter={user.is_writer}
                adminRole={user.admin_role}
              />
              {user.tagline && (
                <p className="text-foreground mt-2 text-sm font-semibold">{user.tagline}</p>
              )}
              {user.bio && (
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-line">
                  {user.bio}
                </p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                {[
                  ["Joined", formatDate(user.created_at)],
                  ["Writer since", formatDate(user.writer_since)],
                  ["Stories", String(user.story_count)],
                  ["Published", String(user.published_count)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted-foreground text-xs">{k}</dt>
                    <dd className="text-foreground font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {user.handle && user.is_writer && (
                <Link
                  href={`/writers/${user.handle}`}
                  target="_blank"
                  className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Public profile · @{user.handle}
                </Link>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Account actions" description="Every change is recorded in the audit log.">
          {locked ? (
            <p className="text-muted-foreground flex items-start gap-2 text-sm">
              <ShieldAlert className="text-butter-ink mt-0.5 h-4 w-4 shrink-0" />
              {isSelf
                ? "This is your account. Admin accounts are managed from the command line."
                : "Super admins can't be changed from the app."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPending({ field: "is_active", value: !user.is_active })}
                className={
                  user.is_active
                    ? "border-destructive/30 text-destructive hover:bg-destructive/10 flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
                    : "bg-mint text-mint-ink flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                }
              >
                {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                {user.is_active ? "Suspend account" : "Reactivate account"}
              </button>
              {(user.is_writer || user.pen_name) && (
                <button
                  type="button"
                  onClick={() => setPending({ field: "is_writer", value: !user.is_writer })}
                  className="border-border text-foreground hover:bg-muted flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  {user.is_writer ? (
                    <PenOff className="h-4 w-4" />
                  ) : (
                    <PenLine className="h-4 w-4" />
                  )}
                  {user.is_writer ? "Remove writer access" : "Restore writer access"}
                </button>
              )}
            </div>
          )}
        </Panel>
      </div>

      <h2 className="text-foreground mt-8 mb-3 text-sm font-bold">Reading</h2>
      <ReadingStatsPanel scope={{ scope: "user", id: user.id }} />

      <h2 className="text-foreground mt-8 mb-3 text-sm font-bold">Stories</h2>
      {user.stories.length === 0 ? (
        <div className="bg-card border-border rounded-3xl border">
          <EmptyState icon={BookOpen} title="No stories yet" />
        </div>
      ) : (
        <StoryTable stories={user.stories} showAuthor={false} />
      )}

      {copy && pending && (
        <ConfirmDialog
          open
          title={copy.title}
          description={copy.body}
          confirmLabel={copy.label}
          icon={copy.icon}
          destructive={copy.destructive}
          pending={update.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() =>
            update.mutate({ [pending.field]: pending.value }, { onSettled: () => setPending(null) })
          }
        />
      )}
    </AdminPage>
  )
}
