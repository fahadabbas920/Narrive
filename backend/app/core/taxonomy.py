"""The single source of truth for story classification. Served by GET /taxonomy and
enforced by the story / writer-profile schemas, so clients can't store anything else."""

GENRES: tuple[str, ...] = (
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
    "Supernatural",
    "Dystopian",
    "Crime",
    "Fairy Tale",
    "Slice of Life",
    "Paranormal",
    "Post-Apocalyptic",
    "Action",
)

MOODS: tuple[str, ...] = (
    "Dark",
    "Lighthearted",
    "Suspenseful",
    "Romantic",
    "Whimsical",
    "Melancholic",
    "Tense",
    "Hopeful",
    "Cozy",
    "Eerie",
    "Epic",
    "Heartwarming",
    "Bittersweet",
    "Mysterious",
    "Humorous",
    "Thought-provoking",
)

CONTENT_RATINGS: tuple[dict[str, str], ...] = (
    {"value": "kids", "label": "Kids", "hint": "all ages"},
    {"value": "everyone", "label": "Everyone", "hint": "10+"},
    {"value": "teen", "label": "Teen", "hint": "13+"},
    {"value": "mature", "label": "Mature", "hint": "16+"},
    {"value": "adult", "label": "Adult", "hint": "18+"},
)
CONTENT_RATING_VALUES = frozenset(r["value"] for r in CONTENT_RATINGS)

# Pastel pairs defined in the frontend theme (bg-<tone> / text-<tone>-ink).
PROFILE_TONES: tuple[str, ...] = ("lavender", "peach", "mint", "sky", "blush", "butter")

SOCIAL_PLATFORMS: tuple[dict[str, str], ...] = (
    {"value": "instagram", "label": "Instagram", "domain": "instagram.com"},
    {"value": "x", "label": "X", "domain": "x.com"},
    {"value": "tiktok", "label": "TikTok", "domain": "tiktok.com"},
    {"value": "substack", "label": "Substack", "domain": "substack.com"},
)
SOCIAL_DOMAINS = {p["value"]: p["domain"] for p in SOCIAL_PLATFORMS}
MAX_SOCIAL_LINKS = 3
MAX_BIO_LENGTH = 600

MAX_STORY_GENRES = 5
MAX_STORY_MOODS = 5
MAX_WRITER_GENRES = 5
MAX_TAGS = 10
MAX_TAG_LENGTH = 30

# Case-insensitive lookup so "sci-fi" is stored as the canonical "Sci-Fi".
_GENRE_LOOKUP = {g.casefold(): g for g in GENRES}
_MOOD_LOOKUP = {m.casefold(): m for m in MOODS}


def _canonical_subset(
    values: list[str], lookup: dict[str, str], kind: str, limit: int
) -> list[str]:
    result: list[str] = []
    unknown: list[str] = []
    for raw in values:
        canonical = lookup.get(raw.strip().casefold())
        if canonical is None:
            unknown.append(raw)
        elif canonical not in result:
            result.append(canonical)
    if unknown:
        raise ValueError(f"Unknown {kind}: {', '.join(unknown)}")
    if len(result) > limit:
        raise ValueError(f"Pick at most {limit} {kind}")
    return result


def clean_genres(values: list[str], limit: int = MAX_STORY_GENRES) -> list[str]:
    return _canonical_subset(values, _GENRE_LOOKUP, "genres", limit)


def clean_moods(values: list[str]) -> list[str]:
    return _canonical_subset(values, _MOOD_LOOKUP, "moods", MAX_STORY_MOODS)


def clean_content_rating(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    if value not in CONTENT_RATING_VALUES:
        raise ValueError(f"Unknown content rating: {value}")
    return value


def clean_tags(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for raw in values:
        tag = " ".join(raw.split()).lstrip("#")
        if not tag:
            continue
        if len(tag) > MAX_TAG_LENGTH:
            raise ValueError(f"Themes must be {MAX_TAG_LENGTH} characters or fewer")
        if tag.casefold() not in seen:
            seen.add(tag.casefold())
            result.append(tag)
    if len(result) > MAX_TAGS:
        raise ValueError(f"Add at most {MAX_TAGS} themes")
    return result
