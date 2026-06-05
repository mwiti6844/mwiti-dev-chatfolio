#!/usr/bin/env python3
"""Create MongoDB collections and Atlas Search indexes for ChatFolio memory."""

from pathlib import Path
import os
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))

import portfolio_memory


def main() -> int:
    if not os.environ.get("MONGODB_URI"):
        print("Missing MONGODB_URI")
        return 1

    try:
        from pymongo import ASCENDING, TEXT
        from pymongo.operations import SearchIndexModel
    except Exception as exc:
        print(f"Missing pymongo dependency: {exc}")
        print("Run: python3 -m pip install -r requirements.txt")
        return 1

    client = portfolio_memory._client()
    db = client[os.environ.get("MONGODB_DB", portfolio_memory.DEFAULT_DB_NAME)]
    collection = db[portfolio_memory.KNOWLEDGE_COLLECTION]

    collection.create_index([("slug", ASCENDING)], unique=True)
    collection.create_index([("type", ASCENDING)])
    collection.create_index([("tags", ASCENDING)])
    collection.create_index([("title", TEXT), ("content", TEXT)], name="knowledge_text_index")
    print(f"Prepared collection: {db.name}.{collection.name}")

    definition = {
        "fields": [
            {
                "type": "vector",
                "path": "embedding",
                "numDimensions": portfolio_memory.EMBEDDING_DIMENSIONS,
                "similarity": "cosine",
            },
            {"type": "filter", "path": "type"},
            {"type": "filter", "path": "tags"},
        ]
    }

    try:
        existing = {
            index.get("name")
            for index in collection.list_search_indexes()
            if isinstance(index, dict)
        }
        if portfolio_memory.VECTOR_INDEX_NAME in existing:
            print(f"Atlas vector index already exists: {portfolio_memory.VECTOR_INDEX_NAME}")
        else:
            model = SearchIndexModel(
                definition=definition,
                name=portfolio_memory.VECTOR_INDEX_NAME,
                type="vectorSearch",
            )
            collection.create_search_index(model)
            print(f"Creating Atlas vector index: {portfolio_memory.VECTOR_INDEX_NAME}")
            print("Atlas may take 1-2 minutes before the index is queryable.")
            time.sleep(2)
    except Exception as exc:
        print("Could not create/list Atlas Search index automatically.")
        print("This usually means the cluster is not Atlas, or your user lacks Search index permissions.")
        print(f"Error: {exc}")
        print("Create this Atlas Vector Search index manually:")
        print(definition)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
