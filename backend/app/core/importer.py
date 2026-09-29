"""Validate and commit bulk story imports. Validation never writes; commit re-validates and
creates everything in one transaction (all or nothing)."""

from datetime import UTC, datetime
from typing import Any

from pydantic import ValidationError
from sqlmodel import Session, col, select

from app.core.story_graph import Node, analyze, tidy_layout
from app.models.admin import StoryImport
from app.models.story import Choice, Scene, SceneType, Story, StoryStatus
from app.models.user import User
from app.schemas.story_import import (
    IMPORT_FORMAT,
    IMPORT_VERSION,
    MAX_STORIES,
    ImportProblem,
    ImportReport,
    ImportStory,
    ImportStoryReport,
)


def _path(loc: tuple[Any, ...], prefix: str = "") -> str:
    out = prefix
    for part in loc:
        out += f"[{part}]" if isinstance(part, int) else (f".{part}" if out else str(part))
    return out or "(file)"


def _message(err: dict[str, Any]) -> str:
    msg = str(err.get("msg", "Invalid value"))
    if err.get("type") == "extra_forbidden":
        return "Unknown field"
    return msg.removeprefix("Value error, ")


def _check_story(index: int, story: ImportStory, taken_titles: set[str]) -> ImportStoryReport:
    base = f"stories[{index}]"
    report = ImportStoryReport(
        index=index,
        title=story.title,
        status=story.status,
        scenes=len(story.scenes),
        choices=sum(len(s.choices) for s in story.scenes),
        endings=sum(1 for s in story.scenes if s.type == "ending"),
        words=sum(len(s.content.split()) for s in story.scenes),
    )
    err, warn = report.errors, report.warnings

    keys: dict[str, int] = {}
    for i, scene in enumerate(story.scenes):
        if scene.key in keys:
            err.append(
                ImportProblem(
                    path=f"{base}.scenes[{i}].key",
                    message=f'Duplicate key "{scene.key}" (also used by scenes[{keys[scene.key]}])',
                )
            )
        else:
            keys[scene.key] = i

    edges: list[tuple[str, str]] = []
    for i, scene in enumerate(story.scenes):
        for j, choice in enumerate(scene.choices):
            path = f"{base}.scenes[{i}].choices[{j}].to"
            if choice.to not in keys:
                err.append(ImportProblem(path=path, message=f'No scene has the key "{choice.to}"'))
            elif choice.to == scene.key:
                err.append(ImportProblem(path=path, message="A choice can't lead to its own scene"))
            else:
                edges.append((scene.key, choice.to))

    starts = [i for i, s in enumerate(story.scenes) if s.type == "start"]
    if len(starts) != 1:
        err.append(
            ImportProblem(
                path=f"{base}.scenes",
                message='Exactly one scene must have type "start"'
                + (f" (found {len(starts)})" if starts else " (found none)"),
            )
        )

    if story.status == "published" and report.endings == 0:
        err.append(
            ImportProblem(
                path=f"{base}.status",
                message='A published story needs at least one "ending" scene',
            )
        )

    if len(starts) == 1:
        health = analyze([Node(s.key, s.type) for s in story.scenes], edges)
        index_of = {s.key: i for i, s in enumerate(story.scenes)}
        for key in health.unreachable:
            warn.append(
                ImportProblem(
                    path=f"{base}.scenes[{index_of[key]}]",
                    message=f'Scene "{key}" can\'t be reached from the start',
                )
            )
        for key in health.dead_ends:
            warn.append(
                ImportProblem(
                    path=f"{base}.scenes[{index_of[key]}]",
                    message=f'Scene "{key}" has no choices and isn\'t an ending',
                )
            )
        if report.endings and health.reachable_endings == 0:
            warn.append(
                ImportProblem(
                    path=f"{base}.scenes", message="No ending is reachable from the start"
                )
            )

    title_key = story.title.casefold()
    if title_key in taken_titles:
        warn.append(
            ImportProblem(
                path=f"{base}.title", message="A Narrive Original with this title already exists"
            )
        )
    return report


def validate_import(
    payload: Any, db: Session, house: User
) -> tuple[ImportReport, list[ImportStory]]:
    report = ImportReport(valid=False)
    if not isinstance(payload, dict):
        report.errors.append(ImportProblem(path="(file)", message="The file must be a JSON object"))
        return report, []

    if payload.get("format") != IMPORT_FORMAT:
        report.errors.append(ImportProblem(path="format", message=f'Must be "{IMPORT_FORMAT}"'))
    if payload.get("version") != IMPORT_VERSION:
        report.errors.append(
            ImportProblem(
                path="version", message=f"Unsupported version (expected {IMPORT_VERSION})"
            )
        )
    unknown = set(payload) - {"format", "version", "stories"}
    for key in sorted(unknown):
        report.errors.append(ImportProblem(path=str(key), message="Unknown field"))

    raw_stories = payload.get("stories")
    if not isinstance(raw_stories, list) or not raw_stories:
        report.errors.append(
            ImportProblem(path="stories", message="Must be a list with at least one story")
        )
        return report, []
    if len(raw_stories) > MAX_STORIES:
        report.errors.append(
            ImportProblem(
                path="stories",
                message=f"At most {MAX_STORIES} stories per import (got {len(raw_stories)})",
            )
        )
        return report, []

    existing = db.exec(select(Story.title).where(Story.author_id == house.id)).all()
    taken = {t.casefold() for t in existing}
    seen_in_file: dict[str, int] = {}

    parsed: list[ImportStory] = []
    for i, raw in enumerate(raw_stories):
        try:
            story = ImportStory.model_validate(raw)
        except ValidationError as exc:
            title = raw.get("title") if isinstance(raw, dict) else None
            report.stories.append(
                ImportStoryReport(
                    index=i,
                    title=str(title or f"Story {i + 1}"),
                    status=str(raw.get("status", "draft")) if isinstance(raw, dict) else "draft",
                    errors=[
                        ImportProblem(path=_path(e["loc"], f"stories[{i}]"), message=_message(e))
                        for e in exc.errors()
                    ],
                )
            )
            continue
        story_report = _check_story(i, story, taken)
        key = story.title.casefold()
        if key in seen_in_file:
            story_report.warnings.append(
                ImportProblem(
                    path=f"stories[{i}].title",
                    message=f"Same title as stories[{seen_in_file[key]}] in this file",
                )
            )
        seen_in_file.setdefault(key, i)
        report.stories.append(story_report)
        parsed.append(story)

    report.story_count = len(report.stories)
    report.scene_count = sum(s.scenes for s in report.stories)
    report.choice_count = sum(s.choices for s in report.stories)
    report.valid = not report.errors and all(not s.errors for s in report.stories)
    return report, parsed if report.valid else []


def commit_import(
    stories: list[ImportStory], db: Session, house: User, actor: User
) -> tuple[StoryImport, list[Story]]:
    """Adds everything to the session; the caller commits once (with the audit entry)."""
    now = datetime.now(UTC)
    batch = StoryImport(
        actor_id=actor.id,
        story_count=len(stories),
        scene_count=sum(len(s.scenes) for s in stories),
    )
    db.add(batch)
    db.flush()

    created: list[Story] = []
    for data in stories:
        published = data.status == "published"
        story = Story(
            author_id=house.id,
            title=data.title,
            description=data.description,
            genres=data.genres,
            moods=data.moods,
            content_rating=data.content_rating,
            tags=data.tags,
            status=StoryStatus.published if published else StoryStatus.draft,
            published_at=now if published else None,
            import_id=batch.id,
        )
        db.add(story)

        # Use the file's positions only when every scene has one; otherwise lay the whole
        # story out so hand-placed and auto-placed scenes can't overlap.
        edges = [(s.key, c.to) for s in data.scenes for c in s.choices]
        if all(s.position for s in data.scenes):
            layout = {s.key: (s.position.x, s.position.y) for s in data.scenes if s.position}
        else:
            layout = tidy_layout([Node(s.key, s.type) for s in data.scenes], edges)

        # IDs are generated client-side, so one flush per story (scenes before choices) is enough.
        scene_ids: dict[str, Any] = {}
        for s in data.scenes:
            x, y = layout[s.key]
            scene = Scene(
                story_id=story.id,
                title=s.title,
                content=s.content,
                scene_type=SceneType(s.type),
                position_x=x,
                position_y=y,
            )
            db.add(scene)
            scene_ids[s.key] = scene.id
        db.flush()
        for s in data.scenes:
            for order, c in enumerate(s.choices):
                db.add(
                    Choice(
                        story_id=story.id,
                        from_scene_id=scene_ids[s.key],
                        to_scene_id=scene_ids[c.to],
                        text=c.text,
                        display_order=order,
                    )
                )
        created.append(story)
    return batch, created


def stories_in_import(db: Session, import_id: Any) -> list[Story]:
    return list(db.exec(select(Story).where(col(Story.import_id) == import_id)).all())
