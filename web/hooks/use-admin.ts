"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  adminApi,
  type AdminStoryUpdate,
  type AuditFilters,
  type CreateOriginalPayload,
  type StoryFilters,
  type UserFilters,
} from "@/lib/api/admin"
import { showToast } from "@/lib/toast"

type ApiError = { detail?: unknown; status?: number }

export function errorText(error: unknown, fallback = "Something went wrong"): string {
  const detail = (error as ApiError)?.detail
  return typeof detail === "string" ? detail : fallback
}

/** Admin changes can show up in the public catalogue, so refresh those caches too. */
function useInvalidateAdmin() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] })
    queryClient.invalidateQueries({ queryKey: ["public-stories"] })
    queryClient.invalidateQueries({ queryKey: ["public-story"] })
    queryClient.invalidateQueries({ queryKey: ["stories"] })
  }
}

export function useAdminOverview() {
  return useQuery({ queryKey: ["admin", "overview"], queryFn: adminApi.overview })
}

export function useAdminHealth() {
  return useQuery({ queryKey: ["admin", "health"], queryFn: adminApi.health })
}

export function useAdminUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => adminApi.users(filters),
    placeholderData: keepPreviousData,
  })
}

export function useAdminUser(id: string) {
  return useQuery({ queryKey: ["admin", "user", id], queryFn: () => adminApi.user(id) })
}

export function useUpdateAdminUser(id: string) {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: (body: { is_active?: boolean; is_writer?: boolean }) =>
      adminApi.updateUser(id, body),
    onSuccess: () => {
      invalidate()
      showToast.success("Account updated")
    },
    onError: (e) => showToast.error(errorText(e, "Couldn't update the account")),
  })
}

export function useAdminStories(filters: StoryFilters) {
  return useQuery({
    queryKey: ["admin", "stories", filters],
    queryFn: () => adminApi.stories(filters),
    placeholderData: keepPreviousData,
  })
}

export function useAdminStory(id: string) {
  return useQuery({ queryKey: ["admin", "story", id], queryFn: () => adminApi.story(id) })
}

export function useUpdateAdminStory() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, ...body }: AdminStoryUpdate & { id: string }) =>
      adminApi.updateStory(id, body),
    onSuccess: () => invalidate(),
    onError: (e) => showToast.error(errorText(e, "Couldn't update the story")),
  })
}

export function useDeleteAdminStory() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteStory(id),
    onSuccess: () => {
      invalidate()
      showToast.success("Story deleted")
    },
    onError: (e) => showToast.error(errorText(e, "Couldn't delete the story")),
  })
}

export function useOriginals() {
  return useQuery({ queryKey: ["admin", "originals"], queryFn: adminApi.originals })
}

export function useCreateOriginal() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: (body: CreateOriginalPayload) => adminApi.createOriginal(body),
    onSuccess: () => invalidate(),
    onError: (e) => showToast.error(errorText(e, "Couldn't create the story")),
  })
}

export function useValidateImport() {
  return useMutation({ mutationFn: (payload: unknown) => adminApi.validateImport(payload) })
}

export function useCommitImport() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: (payload: unknown) => adminApi.commitImport(payload),
    onSuccess: () => invalidate(),
  })
}

export function useImports() {
  return useQuery({ queryKey: ["admin", "imports"], queryFn: adminApi.imports })
}

export function useUndoImport() {
  const invalidate = useInvalidateAdmin()
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => adminApi.undoImport(id, force),
    onSuccess: () => {
      invalidate()
      showToast.success("Import undone")
    },
  })
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ["admin", "audit", filters],
    queryFn: () => adminApi.audit(filters),
    placeholderData: keepPreviousData,
  })
}
