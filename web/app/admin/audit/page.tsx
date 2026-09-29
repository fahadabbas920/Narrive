"use client"

import { Suspense } from "react"
import Link from "next/link"
import { ScrollText } from "lucide-react"
import { useAuditLog } from "@/hooks/use-admin"
import type { AuditEntry } from "@/lib/api/admin"
import {
  AdminPage,
  DataTable,
  EmptyState,
  FilterChips,
  Pagination,
  Skeleton,
  formatDate,
  td,
  th,
} from "@/components/admin/admin-ui"
import { ACTION_GROUPS, describeAction } from "@/components/admin/audit-text"
import { useUrlFilters } from "@/components/admin/use-url-filters"

function targetHref(a: AuditEntry): string | null {
  if (!a.target_id || a.action === "story.delete") return null
  if (a.target_type === "user") return `/admin/users/${a.target_id}`
  if (a.target_type === "story") return `/admin/stories/${a.target_id}`
  return null
}

function AuditTable() {
  const { values, page, set } = useUrlFilters(["action"] as const)
  const { data, isLoading, isFetching } = useAuditLog({ action: values.action || undefined, page })

  return (
    <>
      <div className="mb-4">
        <FilterChips
          label="Action type"
          value={values.action}
          onChange={(action) => set({ action })}
          options={ACTION_GROUPS.map((g) => ({ value: g.value, label: g.label }))}
        />
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : data.items.length === 0 ? (
        <div className="bg-card border-border rounded-3xl border">
          <EmptyState icon={ScrollText} title="Nothing recorded yet">
            Every change an admin makes — suspensions, unpublishing, features, imports — shows up
            here.
          </EmptyState>
        </div>
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <DataTable>
            <thead>
              <tr>
                <th className={th}>When</th>
                <th className={th}>What happened</th>
                <th className={th}>Admin</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => {
                const href = targetHref(a)
                return (
                  <tr key={a.id}>
                    <td className={`${td} text-muted-foreground whitespace-nowrap`}>
                      {formatDate(a.created_at, true)}
                    </td>
                    <td className={td}>
                      {href ? (
                        <Link
                          href={href}
                          className="text-foreground hover:text-primary font-semibold"
                        >
                          {describeAction(a)}
                        </Link>
                      ) : (
                        <span className="text-foreground font-semibold">{describeAction(a)}</span>
                      )}
                      <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                        {a.action}
                      </span>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{a.actor_email}</td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onPage={(p) => set({ page: p })}
          />
        </div>
      )}
    </>
  )
}

export default function AdminAuditPage() {
  return (
    <AdminPage
      title="Audit log"
      description="Every change made from the admin console, newest first."
    >
      <Suspense fallback={<Skeleton className="h-96" />}>
        <AuditTable />
      </Suspense>
    </AdminPage>
  )
}
