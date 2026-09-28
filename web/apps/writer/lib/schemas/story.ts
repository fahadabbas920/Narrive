import { z } from "zod"

export const createStorySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().min(1, "Description is required").max(1000, "Description is too long"),
  genres: z.array(z.string()),
  moods: z.array(z.string()),
  contentRating: z.string().optional(),
  tags: z.array(z.string()),
})

export type CreateStoryFormData = z.infer<typeof createStorySchema>
