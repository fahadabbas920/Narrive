const TONES = [
  "from-peach to-blush",
  "from-lavender to-sky",
  "from-mint to-sky",
  "from-butter to-peach",
  "from-blush to-lavender",
  "from-sky to-mint",
]

/** Stable pastel gradient per story, so a story keeps its colour everywhere. */
export function storyTone(id: string): string {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}
