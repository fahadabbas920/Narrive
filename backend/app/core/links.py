from urllib.parse import urlsplit, urlunsplit

from app.core.taxonomy import MAX_SOCIAL_LINKS, SOCIAL_DOMAINS

MAX_URL_LENGTH = 200
# Accept legacy domains people still paste.
_DOMAIN_ALIASES = {"x": ("x.com", "twitter.com")}


def clean_url(value: str | None) -> str | None:
    """Normalise to an absolute http(s) URL; anything else (javascript:, data:, …) is rejected."""
    if value is None or not value.strip():
        return None
    raw = value.strip()
    if "://" not in raw:
        raw = f"https://{raw}"
    parts = urlsplit(raw)
    host = (parts.hostname or "").lower()
    if parts.scheme not in ("http", "https") or "." not in host or any(c.isspace() for c in raw):
        raise ValueError("Enter a valid web address, like https://example.com")
    url = urlunsplit((parts.scheme, parts.netloc.lower(), parts.path, parts.query, ""))
    if len(url) > MAX_URL_LENGTH:
        raise ValueError(f"Links must be {MAX_URL_LENGTH} characters or fewer")
    return url


def clean_social_links(links: list[dict[str, str]]) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    seen: set[str] = set()
    for link in links:
        platform = (link.get("platform") or "").strip().lower()
        if platform not in SOCIAL_DOMAINS:
            raise ValueError(f"Unknown social platform: {platform or '(empty)'}")
        if platform in seen:
            raise ValueError("Add each platform only once")
        url = clean_url(link.get("url"))
        if url is None:
            continue
        host = (urlsplit(url).hostname or "").removeprefix("www.")
        domains = _DOMAIN_ALIASES.get(platform, (SOCIAL_DOMAINS[platform],))
        if not any(host == d or host.endswith(f".{d}") for d in domains):
            raise ValueError(f"That doesn't look like a {SOCIAL_DOMAINS[platform]} link")
        seen.add(platform)
        result.append({"platform": platform, "url": url})
    if len(result) > MAX_SOCIAL_LINKS:
        raise ValueError(f"Add at most {MAX_SOCIAL_LINKS} social links")
    return result
