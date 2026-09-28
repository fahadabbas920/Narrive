"use client"

import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { taxonomyApi } from "@/lib/api/taxonomy"

/** Genres, moods, ratings and limits — owned and enforced by the backend. */
export function useTaxonomy() {
  return useQuery({
    queryKey: ["taxonomy"],
    queryFn: taxonomyApi.get,
    staleTime: 60 * 60_000,
    gcTime: Infinity,
  })
}

/** Maps a stored rating value ("teen") to its label ("Teen"); falls back to the raw value. */
export function useRatingLabel() {
  const { data } = useTaxonomy()
  return useCallback(
    (value: string | null | undefined): string | null =>
      value ? (data?.content_ratings.find((r) => r.value === value)?.label ?? value) : null,
    [data],
  )
}
