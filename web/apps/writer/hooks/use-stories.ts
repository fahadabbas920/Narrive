"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { storiesApi, type CreateStoryPayload, type UpdateStoryPayload } from "@/lib/api/stories"
import { showToast } from "@workspace/ui/lib/toast"

export function useStories() {
  return useQuery({
    queryKey: ["stories"],
    queryFn: storiesApi.list,
  })
}

export function useStory(id: string) {
  return useQuery({
    queryKey: ["stories", id],
    queryFn: () => storiesApi.get(id),
    enabled: !!id,
  })
}

export function useCreateStory() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateStoryPayload) => storiesApi.create(payload),
    onSuccess: (story) => {
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      showToast.success("Story created!")
      router.push(`/stories/${story.id}`)
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to create story")
    },
  })
}

export function useUpdateStory(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateStoryPayload) => storiesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", id] })
      queryClient.invalidateQueries({ queryKey: ["stories"] })
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to update story")
    },
  })
}

export function useDeleteStory() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => storiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      showToast.success("Story deleted")
      router.push("/stories")
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to delete story")
    },
  })
}

export function usePublishStory(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (publish: boolean) =>
      storiesApi.update(id, { status: publish ? "published" : "draft" }),
    onSuccess: (story) => {
      queryClient.invalidateQueries({ queryKey: ["stories", id] })
      queryClient.invalidateQueries({ queryKey: ["stories"] })
      showToast.success(story.status === "published" ? "Story published!" : "Story unpublished")
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to update story status")
    },
  })
}
