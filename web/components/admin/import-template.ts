/** A complete, valid example in the "narrive-story" v1 format (see ADMIN-PLAN.md §5). */
export const IMPORT_TEMPLATE = {
  format: "narrive-story",
  version: 1,
  stories: [
    {
      title: "The Lantern Keeper",
      description: "A lighthouse, a storm, and a stranger at the door.",
      genres: ["Mystery"],
      moods: ["Eerie", "Mysterious"],
      content_rating: "everyone",
      tags: ["lighthouse", "storm"],
      status: "draft",
      scenes: [
        {
          key: "start",
          type: "start",
          title: "The knock",
          content:
            "Rain hammers the glass of the lamp room. Somewhere below, three slow knocks echo up the spiral stairs.",
          choices: [
            { text: "Go down and open the door", to: "stranger" },
            { text: "Climb to the lamp and signal the shore", to: "lamp" },
          ],
        },
        {
          key: "stranger",
          title: "The stranger",
          content: "A soaked traveller holds out a brass key that looks exactly like yours.",
          choices: [
            { text: "Take the key", to: "end-dawn" },
            { text: "Shut the door", to: "end-storm" },
          ],
        },
        {
          key: "lamp",
          title: "The lamp",
          content: "You swing the great lens toward the shore. A light answers from the cliffs.",
          choices: [{ text: "Follow the answering light", to: "end-dawn" }],
        },
        {
          key: "end-dawn",
          type: "ending",
          title: "Dawn",
          content: "By morning the storm has passed, and the lighthouse has two keepers.",
        },
        {
          key: "end-storm",
          type: "ending",
          title: "The long night",
          content: "The knocking never comes again. Neither does the morning ferry.",
        },
      ],
    },
  ],
}

export const FORMAT_RULES = [
  'Each scene has a short key you make up, like "start" or "end-dawn". Choices point at keys.',
  'Exactly one scene per story has "type": "start". Others are "middle" (the default) or "ending".',
  "Choices sit inside the scene they start from, in the order readers will see them.",
  '"position": {"x", "y"} is optional. Leave it out and scenes are laid out automatically.',
  'Genres, moods and ratings must come from Narrive\'s lists. "status" is "draft" (default) or "published".',
  "Up to 50 stories, 500 scenes per story and 2 MB per import. Everything is imported as Narrive Originals.",
]

/** Import limits, mirroring backend/app/schemas/story_import.py. */
export const IMPORT_LIMITS = {
  stories: 50,
  scenesPerStory: 500,
  choicesPerScene: 20,
  keyLength: 60,
  titleLength: 200,
  choiceLength: 500,
  descriptionLength: 5000,
} as const

interface PromptTaxonomy {
  genres: string[]
  moods: string[]
  content_ratings: { value: string; label: string; hint: string }[]
  limits: { story_genres: number; story_moods: number; tags: number; tag_length: number }
}

/** Allowed genres/moods/ratings come from the live taxonomy so AI output passes the importer. */
export function buildAiPrompt(taxonomy: PromptTaxonomy): string {
  const { limits } = taxonomy
  const ratings = taxonomy.content_ratings.map((r) => `${r.value} (${r.label}, ${r.hint})`)
  return `You are writing branching interactive fiction for Narrive, a platform where readers pick choices and each choice leads to a different scene. Your output is imported straight into Narrive by a strict importer, so it must follow every rule below exactly.

## What I want
[Describe the stories: how many, genre and tone, audience, anything else. Example: "5 short cozy mystery stories set in small seaside towns, each with 3 different endings."]

## Output
- Reply with ONE JSON object and nothing else: no Markdown code fences, no comments, no explanation before or after.
- Use plain double-quoted JSON. Escape quotes inside text as \\". No trailing commas.

## File structure
(The // notes below explain each field. Never put comments in your output.)
{
  "format": "narrive-story",        // exactly this
  "version": 1,                     // exactly this
  "stories": [ ...story objects... ] // 1 to ${IMPORT_LIMITS.stories} stories
}

Each story has exactly these fields (no others):
- "title": string, 1–${IMPORT_LIMITS.titleLength} characters, unique across the file.
- "description": string, one or two sentences that hook the reader (max ${IMPORT_LIMITS.descriptionLength} characters).
- "genres": 1–${limits.story_genres} values, ONLY from the allowed genres below.
- "moods": 1–${limits.story_moods} values, ONLY from the allowed moods below.
- "content_rating": ONE value from the allowed ratings below.
- "tags": up to ${limits.tags} short free-form themes, lowercase, each at most ${limits.tag_length} characters.
- "status": "draft".
- "scenes": list of scene objects (at most ${IMPORT_LIMITS.scenesPerStory}).

Each scene has exactly these fields (no others):
- "key": a short unique id you make up within the story, lowercase with hyphens, e.g. "start", "cellar", "end-dawn" (max ${IMPORT_LIMITS.keyLength} characters).
- "type": "start", "middle" or "ending". Leave it out for middle scenes.
- "title": short scene title.
- "content": the scene text.
- "choices": list of { "text": string, "to": "<key of another scene>" }. Leave it out for endings.

## Structure rules (the importer rejects the file if any are broken)
1. Exactly ONE scene per story has "type": "start". Put it first.
2. Every "to" must be the key of another scene in the SAME story. A choice can never point to its own scene.
3. Keys are unique within a story.
4. Every non-ending scene has at least one choice (2–3 is best, at most ${IMPORT_LIMITS.choicesPerScene}).
5. Ending scenes ("type": "ending") have no choices. Every story has at least 2 endings.
6. Every scene must be reachable from the start by following choices.
7. Do not add fields that aren't listed above (e.g. no "id", "position", "author", "notes").

## Allowed values (use these exact spellings; anything else is rejected)
Genres: ${taxonomy.genres.join(", ")}
Moods: ${taxonomy.moods.join(", ")}
Content ratings: ${ratings.join("; ")}
Pick the rating honestly: horror, violence or dark themes usually mean teen or higher.

## Writing guidance
- Second person, present tense ("You open the door…").
- Scene content: 60–200 words, vivid and concrete. Endings: 40–120 words that feel earned.
- Choice text: a short action the reader takes (2–8 words), e.g. "Follow the lantern light". Choices in a scene should lead to genuinely different outcomes.
- Aim for 6–12 scenes per story with branches that sometimes rejoin, and 2–4 distinct endings.

## Before you answer, check
- The JSON parses, and every "to" matches a key in the same story.
- Each story has one start, at least two endings, and no dead ends.
- Every genre, mood and rating is copied exactly from the allowed lists.

## Example of one valid story
${JSON.stringify(IMPORT_TEMPLATE, null, 2)}
`
}
