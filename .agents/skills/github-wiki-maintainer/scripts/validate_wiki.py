#!/usr/bin/env python3
"""Validate a Markdown-based GitHub Wiki working tree."""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path
from urllib.parse import unquote, urlsplit


MARKDOWN_SUFFIXES = {".md", ".markdown"}
SPECIAL_PAGES = {"_sidebar", "_footer"}
REGION_RE = re.compile(
    r"<!--\s*(BEGIN|END)\s+CODEX-MAINTAINED:\s*([a-z0-9][a-z0-9-]*)\s*-->",
    re.IGNORECASE,
)
REVISION_RE = re.compile(r"<!--\s*codex-project-revision:\s*([0-9a-f]{40})\s*-->", re.IGNORECASE)
WIKI_LINK_RE = re.compile(r"\[\[([^\]\n]+)\]\]")
MD_LINK_RE = re.compile(r"(?<!!)\[[^\]\n]*\]\(([^)\n]+)\)")
MD_IMAGE_RE = re.compile(r"!\[[^\]\n]*\]\(([^)\n]+)\)")
FENCE_RE = re.compile(r"```.*?```|~~~.*?~~~", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")
HIGH_CONFIDENCE_SECRETS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,})\b"),
    "AWS access key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
}


class WikiValidationError(Exception):
    """Raised when Wiki content fails validation."""


def page_key(value: str) -> str:
    value = unquote(value).strip().replace(" ", "-")
    value = re.sub(r"\.(?:md|markdown)$", "", value, flags=re.IGNORECASE)
    return re.sub(r"-+", "-", value).strip("-").lower()


def visible_markdown(text: str) -> str:
    return INLINE_CODE_RE.sub("", FENCE_RE.sub("", text))


def link_destination(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("<") and ">" in raw:
        return raw[1 : raw.index(">")]
    return raw.split(maxsplit=1)[0]


def resolve_relative_target(
    source: Path,
    raw_target: str,
    root: Path,
    pages_by_key: dict[str, Path],
) -> bool:
    target = unquote(urlsplit(raw_target).path)
    if not target:
        return True

    candidate = (source.parent / target).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        return False
    if candidate.is_file():
        return True

    return page_key(Path(target).name) in pages_by_key


def validate_regions(path: Path, text: str, errors: list[str]) -> None:
    stack: list[str] = []
    seen: set[str] = set()
    for marker in REGION_RE.finditer(text):
        action, region = marker.group(1).upper(), marker.group(2).lower()
        if action == "BEGIN":
            if stack:
                errors.append(f"{path.name}: managed regions may not be nested")
            if region in seen:
                errors.append(f"{path.name}: duplicate managed region '{region}'")
            stack.append(region)
            seen.add(region)
        elif not stack or stack[-1] != region:
            errors.append(f"{path.name}: unmatched END marker for '{region}'")
        else:
            stack.pop()
    for region in stack:
        errors.append(f"{path.name}: missing END marker for '{region}'")


def validate_wiki(root: Path) -> tuple[int, int]:
    if not root.is_dir():
        raise WikiValidationError(f"Wiki path is not a directory: {root}")

    errors: list[str] = []
    pages = sorted(
        path for path in root.iterdir() if path.is_file() and path.suffix.lower() in MARKDOWN_SUFFIXES
    )
    if not pages:
        raise WikiValidationError("Wiki contains no Markdown pages")

    for path in root.rglob("*"):
        if path.is_symlink():
            errors.append(f"{path.relative_to(root)}: symlinks are not allowed")

    pages_by_key: dict[str, Path] = {}
    for path in pages:
        key = page_key(path.name)
        if key in pages_by_key:
            errors.append(f"duplicate page slug: {pages_by_key[key].name} and {path.name}")
        pages_by_key[key] = path
    if "home" not in pages_by_key:
        errors.append("Home.md is required")

    checked_links = 0
    revision_markers = 0
    for path in pages:
        text = path.read_text(encoding="utf-8")
        if not text.strip():
            errors.append(f"{path.name}: page is empty")
            continue

        key = page_key(path.name)
        if key not in SPECIAL_PAGES and not re.search(r"(?m)^#\s+\S", text):
            errors.append(f"{path.name}: normal pages require a top-level heading")

        # Marker examples inside fenced or inline code are documentation, not
        # active ownership boundaries.
        validate_regions(path, visible_markdown(text), errors)
        revision_markers += len(REVISION_RE.findall(text))
        for label, pattern in HIGH_CONFIDENCE_SECRETS.items():
            if pattern.search(text):
                errors.append(f"{path.name}: possible {label} detected")

        scan_text = visible_markdown(text)
        for match in WIKI_LINK_RE.finditer(scan_text):
            payload = match.group(1).strip()
            target = payload.rsplit("|", 1)[-1].strip()
            checked_links += 1
            if page_key(target) not in pages_by_key:
                errors.append(f"{path.name}: unresolved Wiki link [[{payload}]]")

        for match in MD_LINK_RE.finditer(scan_text):
            target = link_destination(match.group(1))
            parsed = urlsplit(target)
            if parsed.scheme in {"http", "https", "mailto", "tel"} or target.startswith("#"):
                continue
            checked_links += 1
            if parsed.scheme == "file" or target.startswith(("/Users/", "/home/", "/tmp/")):
                errors.append(f"{path.name}: local path link is not publishable: {target}")
            elif not resolve_relative_target(path, target, root, pages_by_key):
                errors.append(f"{path.name}: unresolved Markdown link: {target}")

        for match in MD_IMAGE_RE.finditer(scan_text):
            target = link_destination(match.group(1))
            parsed = urlsplit(target)
            if parsed.scheme in {"http", "https", "data"}:
                continue
            checked_links += 1
            if not resolve_relative_target(path, target, root, pages_by_key):
                errors.append(f"{path.name}: unresolved image: {target}")

    if revision_markers > 1:
        errors.append("Wiki may contain at most one codex-project-revision marker")

    if errors:
        raise WikiValidationError("\n".join(f"- {error}" for error in errors))
    return len(pages), checked_links


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / "Home.md").write_text(
            "# Home\n\n[[Guide]]\n\n"
            "<!-- BEGIN CODEX-MAINTAINED: summary -->\n"
            "Current behavior.\n"
            "<!-- END CODEX-MAINTAINED: summary -->\n\n"
            "<!-- codex-project-revision: 0123456789abcdef0123456789abcdef01234567 -->\n",
            encoding="utf-8",
        )
        (root / "Guide.md").write_text(
            "# Guide\n\n[Home](Home)\n\n"
            "```markdown\n"
            "<!-- BEGIN CODEX-MAINTAINED: example -->\n"
            "Example only.\n"
            "<!-- END CODEX-MAINTAINED: example -->\n"
            "```\n",
            encoding="utf-8",
        )
        pages, links = validate_wiki(root)
        assert pages == 2 and links == 2

        (root / "Guide.md").write_text("# Guide\n\n[[Missing]]\n", encoding="utf-8")
        try:
            validate_wiki(root)
        except WikiValidationError as exc:
            assert "unresolved Wiki link" in str(exc)
        else:
            raise AssertionError("broken Wiki link was accepted")

        (root / "Guide.md").write_text(
            "# Guide\n\n-----BEGIN OPENSSH PRIVATE KEY-----\n", encoding="utf-8"
        )
        try:
            validate_wiki(root)
        except WikiValidationError as exc:
            assert "private key" in str(exc)
        else:
            raise AssertionError("secret-like content was accepted")

    print("Wiki validator self-test passed.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wiki", nargs="?", type=Path, help="Path to a GitHub Wiki clone")
    parser.add_argument("--self-test", action="store_true", help="Run built-in validator tests")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.self_test:
        run_self_test()
        return 0
    if args.wiki is None:
        print("error: provide a Wiki path or use --self-test", file=sys.stderr)
        return 2
    try:
        pages, links = validate_wiki(args.wiki.resolve())
    except (OSError, UnicodeError, WikiValidationError) as exc:
        print(f"Wiki validation failed:\n{exc}", file=sys.stderr)
        return 1
    print(f"Wiki validation passed: {pages} page(s), {links} internal link(s) checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
