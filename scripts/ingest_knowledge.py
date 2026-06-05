#!/usr/bin/env python3
"""Ingest editable portfolio knowledge Markdown files into MongoDB memory."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE_DIR = ROOT / "knowledge"
sys.path.insert(0, str(ROOT / "api"))

import portfolio_memory


def parse_scalar(value: str):
    value = value.strip()
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [item.strip().strip("'\"") for item in inner.split(",")]
    return value.strip("'\"")


def parse_markdown(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    metadata = {}
    content = raw

    if raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) == 3:
            _, header, content = parts
            for line in header.splitlines():
                if ":" not in line:
                    continue
                key, value = line.split(":", 1)
                metadata[key.strip()] = parse_scalar(value)

    title = metadata.get("title")
    if not title:
        match = re.search(r"^#\s+(.+)$", content, flags=re.MULTILINE)
        title = match.group(1).strip() if match else path.stem.replace("-", " ").title()

    tags = metadata.get("tags", [])
    if isinstance(tags, str):
        tags = [tag.strip() for tag in tags.split(",") if tag.strip()]

    return {
        "slug": metadata.get("slug", path.stem),
        "title": title,
        "type": metadata.get("type", "portfolio"),
        "tags": tags,
        "source_path": str(path.relative_to(ROOT)),
        "source_url": metadata.get("source_url", ""),
        "content": content.strip(),
    }


def main() -> int:
    if not portfolio_memory.is_configured():
        print("Missing MONGODB_URI or VOYAGE_API_KEY")
        return 1

    files = sorted(KNOWLEDGE_DIR.glob("*.md"))
    if not files:
        print(f"No markdown files found in {KNOWLEDGE_DIR}")
        return 1

    for path in files:
        doc = parse_markdown(path)
        portfolio_memory.upsert_knowledge_doc(doc)
        print(f"Upserted {doc['slug']}: {doc['title']}")

    print(f"Ingested {len(files)} knowledge documents.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
