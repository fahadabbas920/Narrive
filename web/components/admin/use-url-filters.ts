"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/** Filter state kept in the URL, so filtered views can be linked and survive a refresh.
 * Callers must sit under <Suspense> (useSearchParams). Changing a filter resets the page. */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>
  const page = Math.max(1, Number(params.get("page")) || 1)

  const set = useCallback(
    (patch: Partial<Record<K | "page", string | number | null>>) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "") next.delete(k)
        else next.set(k, String(v))
      }
      if (!("page" in patch)) next.delete("page")
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  return { values, page, set }
}
