"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  readingApi,
  type LibraryEntry,
  type ProgressUpdate,
  type StatsScope,
} from "@/lib/api/reading"
import { useSession } from "@/lib/session"
import { showToast } from "@/lib/toast"

const LIBRARY = ["me-library"] as const

/** After reading or saving, lists and stats are stale; they refetch when next shown. */
function useInvalidateReading() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of [LIBRARY, ["me-reading"], ["me-saved"], ["reading-stats"]])
      queryClient.invalidateQueries({ queryKey: key })
  }
}

/** Your status on every story you've touched, fetched once and shared by all cards. */
export function useLibrary() {
  const session = useSession()
  return useQuery({
    queryKey: LIBRARY,
    queryFn: readingApi.library,
    enabled: !!session,
    staleTime: 60_000,
  })
}

export function useLibraryEntry(storyId: string): LibraryEntry | undefined {
  return useLibrary().data?.[storyId]
}

export function useToggleSaved() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateReading()
  return useMutation({
    mutationFn: ({ storyId, saved }: { storyId: string; saved: boolean }) =>
      saved ? readingApi.save(storyId) : readingApi.unsave(storyId),
    onMutate: async ({ storyId, saved }) => {
      await queryClient.cancelQueries({ queryKey: LIBRARY })
      const previous = queryClient.getQueryData<Record<string, LibraryEntry>>(LIBRARY)
      queryClient.setQueryData<Record<string, LibraryEntry>>(LIBRARY, (lib = {}) => {
        const entry = lib[storyId] ?? {
          status: null,
          endings_found: 0,
          endings_total: 0,
          saved: false,
          last_read_at: null,
        }
        return { ...lib, [storyId]: { ...entry, saved } }
      })
      return { previous }
    },
    onError: (_e, { saved }, context) => {
      queryClient.setQueryData(LIBRARY, context?.previous)
      showToast.error(saved ? "Couldn't save the story" : "Couldn't remove the story")
    },
    onSuccess: (_d, { saved }) =>
      showToast.success(saved ? "Saved to Read later" : "Removed from Read later"),
    onSettled: invalidate,
  })
}

/** Server-side progress for one story; `null` when you haven't started it. */
export function useStoryProgress(storyId: string) {
  const session = useSession()
  return useQuery({
    queryKey: ["reading", storyId],
    queryFn: async () => {
      try {
        return await readingApi.progress(storyId)
      } catch (e) {
        if ((e as { status?: number }).status === 404) return null
        throw e
      }
    },
    enabled: !!session,
    retry: false,
    staleTime: 0,
  })
}

export function useSaveProgress(storyId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateReading()
  return useMutation({
    // One at a time, in order: a slow earlier save can't land after a newer one.
    scope: { id: `reading-${storyId}` },
    mutationFn: (body: ProgressUpdate) => readingApi.saveProgress(storyId, body),
    onSuccess: (progress) => {
      queryClient.setQueryData(["reading", storyId], progress)
      invalidate()
    },
  })
}

export function useReadingList(status?: "reading" | "finished") {
  const session = useSession()
  return useQuery({
    queryKey: ["me-reading", status ?? "all"],
    queryFn: () => readingApi.list(status),
    enabled: !!session,
  })
}

export function useSavedList() {
  const session = useSession()
  return useQuery({ queryKey: ["me-saved"], queryFn: readingApi.saved, enabled: !!session })
}

/** The same stats shape for you, one user (admin), one story (admin) or the platform (admin). */
export function useReadingStats(scope: StatsScope) {
  const session = useSession()
  return useQuery({
    queryKey: ["reading-stats", scope],
    queryFn: () => readingApi.stats(scope),
    enabled: !!session,
  })
}
