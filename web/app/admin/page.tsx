"use client"

import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LineChart,
  Sparkles,
} from "lucide-react"
import { useAdminHealth, useAdminOverview } from "@/hooks/use-admin"
import {
  AdminPage,
  EmptyState,
  OriginalBadge,
  Panel,
  Skeleton,
  StatTile,
} from "@/components/admin/admin-ui"
import { BarList, DailyColumns } from "@/components/admin/charts"
import { describeAction } from "@/components/admin/audit-text"
import { WriterAvatar } from "@/components/writer-avatar"
import { timeAgo } from "@/lib/time"

function pct(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "—"
}

function topWithOther(items: { name: string; count: number }[]) {
  const top = items.slice(0, 8).map((i) => ({ name: i.name, value: i.count }))
  const rest = items.slice(8).reduce((s, i) => s + i.count, 0)
  return rest ? [...top, { name: "Other", value: rest }] : top
}

function HealthPanel() {
  const { data, isLoading } = useAdminHealth()
  return (
    <Panel
      title="Content health"
      description={
        data
          ? `${data.checked} published ${data.checked === 1 ? "story" : "stories"} checked`
          : "Structural checks on every published story"
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-24" />
      ) : data.stories.length === 0 ? (
        <p className="text-mint-ink flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          Every published story has a start, reachable endings and no dead ends.
        </p>
      ) : (
        <ul className="divide-border -my-2 divide-y">
          {data.stories.slice(0, 6).map((s) => (
            <li key={s.id} className="py-2.5">
              <Link href={`/admin/stories/${s.id}`} className="group block">
                <p className="text-foreground group-hover:text-primary flex items-center gap-2 text-sm font-semibold">
                  <span className="truncate">{s.title}</span>
                  {s.is_official && <OriginalBadge />}
                </p>
                <p className="text-muted-foreground mt-0.5 flex items-start gap-1.5 text-xs">
                  <AlertTriangle className="text-butter-ink mt-px h-3.5 w-3.5 shrink-0" />
                  {s.issues.map((i) => i.message).join(" · ")}
                </p>
              </Link>
            </li>
          ))}
          {data.stories.length > 6 && (
            <li className="text-muted-foreground pt-2.5 text-xs">
              +{data.stories.length - 6} more with issues
            </li>
          )}
        </ul>
      )}
    </Panel>
  )
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview()

  if (isLoading || !data) {
    return (
      <AdminPage title="Overview" description="How Narrive is doing right now.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64" />
      </AdminPage>
    )
  }

  const { cards, funnel } = data
  const signups = data.growth.map((g) => ({ date: g.date, value: g.signups }))
  const published = data.growth.map((g) => ({ date: g.date, value: g.published }))

  return (
    <AdminPage title="Overview" description="How Narrive is doing right now.">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Users" value={cards.users} hint={`${cards.suspended} suspended`} />
        <StatTile
          label="New users · 7 days"
          value={cards.new_users_7d.value}
          previous={cards.new_users_7d.previous}
          period="previous 7 days"
        />
        <StatTile
          label="New users · 30 days"
          value={cards.new_users_30d.value}
          previous={cards.new_users_30d.previous}
          period="previous 30 days"
        />
        <StatTile
          label="Writers"
          value={cards.writers}
          hint={`${pct(cards.writers, cards.users)} of users`}
        />
        <StatTile
          label="Published stories"
          value={cards.published}
          hint={`${cards.featured} featured`}
        />
        <StatTile label="Drafts" value={cards.drafts} hint={`${cards.archived} archived`} />
        <StatTile label="Narrive Originals" value={cards.originals} />
        <StatTile
          label="Scenes · choices"
          value={cards.scenes}
          hint={`${cards.choices.toLocaleString()} choices`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Sign-ups" description="New accounts per day">
          <DailyColumns data={signups} label="Sign-ups" unit={["sign-up", "sign-ups"]} />
        </Panel>
        <Panel title="Newly published stories" description="First-time publishes per day">
          <DailyColumns
            data={published}
            label="Newly published stories"
            unit={["story", "stories"]}
          />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel
          title="Writer funnel"
          description="Share of everyone who signed up"
          className="lg:col-span-1"
        >
          <BarList
            label="Writer funnel"
            items={[
              { name: "Signed up", value: funnel.signed_up, note: "100%" },
              {
                name: "Became a writer",
                value: funnel.became_writer,
                note: pct(funnel.became_writer, funnel.signed_up),
              },
              {
                name: "Created a story",
                value: funnel.created_story,
                note: pct(funnel.created_story, funnel.signed_up),
              },
              {
                name: "Published",
                value: funnel.published_story,
                note: pct(funnel.published_story, funnel.signed_up),
              },
            ]}
          />
        </Panel>
        <Panel title="Genres" description="Across published stories">
          <BarList
            label="Published stories by genre"
            items={topWithOther(data.genres)}
            empty="No published stories yet"
          />
        </Panel>
        <Panel title="Moods" description="Across published stories">
          <BarList
            label="Published stories by mood"
            items={topWithOther(data.moods)}
            empty="No published stories yet"
          />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <HealthPanel />
        <Panel
          title="Top writers"
          description="By published stories"
          action={
            <Link
              href="/admin/users?sort=stories"
              className="text-primary text-xs font-semibold hover:underline"
            >
              All users
            </Link>
          }
        >
          {data.top_writers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No writers have stories yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.top_writers.map((w) => (
                <li key={w.id}>
                  <Link href={`/admin/users/${w.id}`} className="group flex items-center gap-3">
                    <WriterAvatar
                      name={w.pen_name ?? w.handle}
                      toneName={w.avatar_tone}
                      className="h-9 w-9 text-sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground group-hover:text-primary block truncate text-sm font-semibold">
                        {w.pen_name ?? w.handle}
                      </span>
                      <span className="text-muted-foreground block text-xs">@{w.handle}</span>
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      <span className="text-foreground font-bold">{w.published}</span> published ·{" "}
                      {w.total} total
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Latest sign-ups">
          <ul className="space-y-2.5">
            {data.recent_users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="group flex items-center justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="text-foreground group-hover:text-primary block truncate text-sm font-semibold">
                      {u.pen_name ?? u.email}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {u.is_writer ? "Writer" : "Reader"} · {timeAgo(u.created_at)}
                    </span>
                  </span>
                  <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recently published">
          {data.recent_stories.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing published yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.recent_stories.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/stories/${s.id}`} className="group block">
                    <span className="text-foreground group-hover:text-primary flex items-center gap-2 text-sm font-semibold">
                      <span className="truncate">{s.title}</span>
                      {s.is_official && (
                        <Sparkles
                          className="text-peach-ink h-3.5 w-3.5 shrink-0"
                          aria-label="Original"
                        />
                      )}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {s.author_name} · {s.published_at ? timeAgo(s.published_at) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title="Admin activity"
          action={
            <Link
              href="/admin/audit"
              className="text-primary text-xs font-semibold hover:underline"
            >
              Audit log
            </Link>
          }
        >
          {data.recent_actions.length === 0 ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" /> No admin actions yet.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {data.recent_actions.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="text-foreground">{describeAction(a)}</p>
                  <p className="text-muted-foreground text-xs">
                    {a.actor_email} · {timeAgo(a.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-4">
        <EmptyState icon={LineChart} title="Reading analytics are coming">
          Reads, completions and popular paths need reading events recorded on the server. Reading
          progress is only kept in each reader&apos;s browser today.
        </EmptyState>
      </Panel>
    </AdminPage>
  )
}
