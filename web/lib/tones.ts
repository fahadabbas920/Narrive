/** Static class names per pastel tone (kept literal so Tailwind can see them). */
export const TONES = {
  lavender: {
    fill: "bg-lavender",
    ink: "text-lavender-ink",
    ring: "ring-lavender-ink/40",
    cover: "from-lavender via-sky to-lavender",
  },
  peach: {
    fill: "bg-peach",
    ink: "text-peach-ink",
    ring: "ring-peach-ink/40",
    cover: "from-peach via-blush to-peach",
  },
  mint: {
    fill: "bg-mint",
    ink: "text-mint-ink",
    ring: "ring-mint-ink/40",
    cover: "from-mint via-sky to-mint",
  },
  sky: {
    fill: "bg-sky",
    ink: "text-sky-ink",
    ring: "ring-sky-ink/40",
    cover: "from-sky via-lavender to-sky",
  },
  blush: {
    fill: "bg-blush",
    ink: "text-blush-ink",
    ring: "ring-blush-ink/40",
    cover: "from-blush via-peach to-blush",
  },
  butter: {
    fill: "bg-butter",
    ink: "text-butter-ink",
    ring: "ring-butter-ink/40",
    cover: "from-butter via-peach to-butter",
  },
} as const

export type Tone = keyof typeof TONES

export function tone(name: string | null | undefined) {
  return TONES[(name as Tone) in TONES ? (name as Tone) : "lavender"]
}
