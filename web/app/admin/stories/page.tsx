"use client"

import { Suspense } from "react"
import { Library } from "lucide-react"
import { useAdminStories } from "@/hooks/use-admin"
import { useTaxonomy } from "@/hooks/use-taxonomy"
import type { StoryFilters } from "@/lib/api/admin"
import type { StoryStatus } from "@/lib/api/stories"
import {
  AdminPage,
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  Skeleton,
} from "@/components/admin/admin-ui"
import { StoryTable } from "@/components/admin/story-table"
import { useUrlFilters } from "@/components/admin/use-url-filters"

const KEYS = ["q", "status", "source", "featured", "genre", "sort"] as const

const selectClass =
  "bg-card border-border text-foreground focus-visible:ring-primary/15 h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold shadow-sm outline-none focus-visible:ring-4"

function StoriesTable() {
  const { values, page, set } = useUrlFilters(KEYS)
  const { data: taxonomy } = useTaxonomy()
  const filters: StoryFilters = {
    q: values.q || undefined,
    status: (values.status || undefined) as StoryStatus | undefined,
    official:
      values.source === "originals" ? true : values.source === "writers" ? false : undefined,
    featured: values.featured === "1" ? true : undefined,
    genre: values.genre || undefined,
    sort: (values.sort || "updated") as StoryFilters["sort"],
    page,
  }
  const { data, isLoading, isFetching } = useAdminStories(filters)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Search titles" />
        <FilterChips
          label="Status"
          value={values.status}
          onChange={(status) => set({ status })}
          options={[
            { value: "", label: "All" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <FilterChips
          label="Source"
          value={values.source}
          onChange={(source) => set({ source })}
          options={[
            { value: "", label: "Everyone" },
            { value: "originals", label: "Originals" },
            { value: "writers", label: "Writers" },
          ]}
        />
        <FilterChips
          label="Featured"
          value={values.featured}
          onChange={(featured) => set({ featured })}
          options={[
            { value: "", label: "Any" },
            { value: "1", label: "Featured" },
          ]}
        />
        <select
          aria-label="Genre"
          value={values.genre}
          onChange={(e) => set({ genre: e.target.value })}
          className={selectClass}
        >
          <option value="">All genres</option>
          {taxonomy?.genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort"
          value={values.sort || "updated"}
          onChange={(e) => set({ sort: e.target.value === "updated" ? null : e.target.value })}
          className={selectClass}
        >
          <option value="updated">Recently updated</option>
          <option value="newest">Newest</option>
          <option value="published">Recently published</option>
          <option value="title">Title A–Z</option>
          <option value="featured">Featured order</option>
        </select>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : data.items.length === 0 ? (
        <div className="bg-card border-border rounded-3xl border">
          <EmptyState icon={Library} title="No stories match">
            Try a different search or clear the filters.
          </EmptyState>
        </div>
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <StoryTable stories={data.items} />
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

export default function AdminStoriesPage() {
  return (
    <AdminPage
      title="Stories"
      description="Every story on Narrive — drafts included. Open one to unpublish, feature or delete it."
    >
      <Suspense fallback={<Skeleton className="h-96" />}>
        <StoriesTable />
      </Suspense>
    </AdminPage>
  )
}
