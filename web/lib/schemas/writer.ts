import { z } from "zod"

export const writerProfileSchema = z.object({
  pen_name: z.string().trim().min(2, "At least 2 characters").max(60, "At most 60 characters"),
  bio: z.string().trim().max(280, "Keep it under 280 characters"),
  genres: z.array(z.string()).max(5, "Pick up to 5 genres"),
})

export type WriterProfileData = z.infer<typeof writerProfileSchema>
