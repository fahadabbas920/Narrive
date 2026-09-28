export const GENRES = [
  "Fantasy",
  "Romance",
  "Mystery",
  "Horror",
  "Sci-Fi",
  "Thriller",
  "Adventure",
  "Drama",
  "Comedy",
  "Historical",
]

export const MOODS = [
  "Dark",
  "Lighthearted",
  "Suspenseful",
  "Romantic",
  "Whimsical",
  "Melancholic",
  "Tense",
  "Hopeful",
]

export const CONTENT_RATINGS = [
  { value: "kids", label: "Kids", hint: "all ages" },
  { value: "everyone", label: "Everyone", hint: "10+" },
  { value: "teen", label: "Teen", hint: "13+" },
  { value: "mature", label: "Mature", hint: "16+" },
  { value: "adult", label: "Adult", hint: "18+" },
] as const

export function contentRatingLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return CONTENT_RATINGS.find((r) => r.value === value)?.label ?? value
}
