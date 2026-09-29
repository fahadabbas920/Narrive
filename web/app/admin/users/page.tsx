"use client"

import { Suspense } from "react"
import Link from "next/link"
import { Users } from "lucide-react"
import { useAdminUsers } from "@/hooks/use-admin"
import type { UserFilters } from "@/lib/api/admin"
import {
  AccountBadges,
  AdminPage,
  DataTable,
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  Skeleton,
  formatDate,
  td,
  th,
} from "@/components/admin/admin-ui"
import { useUrlFilters } from "@/components/admin/use-url-filters"
import { WriterAvatar } from "@/components/writer-avatar"

const KEYS = ["q", "role", "status", "sort"] as const

function UsersTable() {
  const { values, page, set } = useUrlFilters(KEYS)
  const filters: UserFilters = {
    q: values.q || undefined,
    role: (values.role || undefined) as UserFilters["role"],
    status: (values.status || undefined) as UserFilters["status"],
    sort: (values.sort || "newest") as UserFilters["sort"],
    page,
  }
  const { data, isLoading, isFetching } = useAdminUsers(filters)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={values.q}
          onChange={(q) => set({ q })}
          placeholder="Search email, handle or pen name"
        />
        <FilterChips
          label="Role"
          value={values.role}
          onChange={(role) => set({ role })}
          options={[
            { value: "", label: "Everyone" },
            { value: "reader", label: "Readers" },
            { value: "writer", label: "Writers" },
            { value: "admin", label: "Admins" },
          ]}
        />
        <FilterChips
          label="Status"
          value={values.status}
          onChange={(status) => set({ status })}
          options={[
            { value: "", label: "Any status" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
        <FilterChips
          label="Sort"
          value={values.sort || "newest"}
          onChange={(sort) => set({ sort: sort === "newest" ? null : sort })}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "stories", label: "Most stories" },
          ]}
        />
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : data.items.length === 0 ? (
        <div className="bg-card border-border rounded-3xl border">
          <EmptyState icon={Users} title="No users match">
            Try a different search or clear the filters.
          </EmptyState>
        </div>
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <DataTable>
            <thead>
              <tr>
                <th className={th}>Account</th>
                <th className={th}>Role</th>
                <th className={`${th} text-right`}>Stories</th>
                <th className={`${th} text-right`}>Published</th>
                <th className={th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                  <td className={td}>
                    <Link href={`/admin/users/${u.id}`} className="group flex items-center gap-3">
                      <WriterAvatar
                        name={u.pen_name ?? u.email}
                        toneName={u.avatar_tone}
                        className="h-9 w-9 text-sm"
                      />
                      <span className="min-w-0">
                        <span className="text-foreground group-hover:text-primary block truncate font-semibold">
                          {u.pen_name ?? u.email.split("@")[0]}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {u.email}
                          {u.handle && ` · @${u.handle}`}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className={td}>
                    <AccountBadges
                      isActive={u.is_active}
                      isWriter={u.is_writer}
                      adminRole={u.admin_role}
                    />
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{u.story_count}</td>
                  <td className={`${td} text-right tabular-nums`}>{u.published_count}</td>
                  <td className={`${td} text-muted-foreground whitespace-nowrap`}>
                    {formatDate(u.created_at)}
                  </td>
                </tr>
              ))}
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

export default function AdminUsersPage() {
  return (
    <AdminPage title="Users" description="Everyone with a Narrive account.">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <UsersTable />
      </Suspense>
    </AdminPage>
  )
}
