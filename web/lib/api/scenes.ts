import { client } from "."
import type { Scene, Choice } from "./stories"

export interface CreateScenePayload {
  title?: string
  content?: string
  scene_type?: "start" | "middle" | "ending"
  position_x?: number
  position_y?: number
}

export interface UpdateScenePayload {
  title?: string
  content?: string
  scene_type?: "start" | "middle" | "ending"
  position_x?: number
  position_y?: number
}

export interface CreateChoicePayload {
  from_scene_id: string
  to_scene_id: string
  text: string
  display_order?: number
}

export interface UpdateChoicePayload {
  text?: string
  display_order?: number
  from_scene_id?: string
  to_scene_id?: string
}

export const scenesApi = {
  create: (storyId: string, payload: CreateScenePayload) =>
    client.post<Scene>(`/api/v1/stories/${storyId}/scenes`, payload),
  update: (storyId: string, sceneId: string, payload: UpdateScenePayload) =>
    client.patch<Scene>(`/api/v1/stories/${storyId}/scenes/${sceneId}`, payload),
  delete: (storyId: string, sceneId: string) =>
    client.delete<void>(`/api/v1/stories/${storyId}/scenes/${sceneId}`),

  createChoice: (storyId: string, payload: CreateChoicePayload) =>
    client.post<Choice>(`/api/v1/stories/${storyId}/choices`, payload),
  updateChoice: (storyId: string, choiceId: string, payload: UpdateChoicePayload) =>
    client.patch<Choice>(`/api/v1/stories/${storyId}/choices/${choiceId}`, payload),
  deleteChoice: (storyId: string, choiceId: string) =>
    client.delete<void>(`/api/v1/stories/${storyId}/choices/${choiceId}`),
}
