"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  scenesApi,
  type CreateScenePayload,
  type UpdateScenePayload,
  type CreateChoicePayload,
  type UpdateChoicePayload,
} from "@/lib/api/scenes"
import { showToast } from "@/lib/toast"

export function useCreateScene(storyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateScenePayload) => scenesApi.create(storyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", storyId] })
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to create scene")
    },
  })
}

export function useUpdateScene(storyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sceneId, payload }: { sceneId: string; payload: UpdateScenePayload }) =>
      scenesApi.update(storyId, sceneId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", storyId] })
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to update scene")
    },
  })
}

export function useDeleteScene(storyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sceneId: string) => scenesApi.delete(storyId, sceneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", storyId] })
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to delete scene")
    },
  })
}

export function useCreateChoice(storyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateChoicePayload) => scenesApi.createChoice(storyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", storyId] })
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to create choice")
    },
  })
}

export function useUpdateChoice(storyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ choiceId, payload }: { choiceId: string; payload: UpdateChoicePayload }) =>
      scenesApi.updateChoice(storyId, choiceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", storyId] })
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to update choice")
    },
  })
}

export function useDeleteChoice(storyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (choiceId: string) => scenesApi.deleteChoice(storyId, choiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", storyId] })
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Failed to delete choice")
    },
  })
}

/** Persist many node positions at once (e.g. after Tidy up) with a single refetch. */
export function useSaveLayout(storyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (positions: { id: string; x: number; y: number }[]) =>
      Promise.all(
        positions.map((p) => scenesApi.update(storyId, p.id, { position_x: p.x, position_y: p.y })),
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", storyId] })
    },
    onError: () => {
      showToast.error("Couldn't save the new layout")
    },
  })
}
