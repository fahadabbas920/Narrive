import re
import unicodedata

from sqlmodel import Session, select

from app.models.user import User

HANDLE_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$")
MIN_LEN, MAX_LEN = 3, 30

# Would collide with app routes or read as official accounts.
RESERVED = frozenset(
    {
        "admin",
        "api",
        "app",
        "edit",
        "help",
        "login",
        "logout",
        "me",
        "narrive",
        "new",
        "profile",
        "register",
        "settings",
        "signup",
        "staff",
        "support",
        "system",
        "write",
        "writer",
        "writers",
    }
)


def validate_handle(value: str) -> str:
    handle = value.strip().lower()
    if not (MIN_LEN <= len(handle) <= MAX_LEN):
        raise ValueError(f"Handle must be {MIN_LEN}–{MAX_LEN} characters")
    if not HANDLE_RE.match(handle) or "--" in handle:
        raise ValueError(
            "Use lowercase letters, numbers and single hyphens (not at the start or end)"
        )
    if handle in RESERVED:
        raise ValueError("That handle is reserved")
    return handle


def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")[:MAX_LEN].strip("-")
    if len(slug) < MIN_LEN or slug in RESERVED:
        slug = f"{slug}-writer".strip("-") if slug else "writer"
    return slug


def handle_taken(db: Session, handle: str, exclude_user: User | None = None) -> bool:
    query = select(User.id).where(User.handle == handle)
    if exclude_user is not None:
        query = query.where(User.id != exclude_user.id)
    return db.exec(query).first() is not None


def unique_handle(db: Session, text: str) -> str:
    base = slugify(text)
    candidate, n = base, 2
    while handle_taken(db, candidate) or candidate in RESERVED:
        suffix = f"-{n}"
        candidate = f"{base[: MAX_LEN - len(suffix)]}{suffix}"
        n += 1
    return candidate
