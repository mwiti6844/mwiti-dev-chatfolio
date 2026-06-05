import json
import os
import re
import time
import urllib.error
import urllib.request
from functools import lru_cache
from typing import Any, Dict, List, Tuple


EMBEDDING_MODEL = "voyage-3.5-lite"
EMBEDDING_DIMENSIONS = 1024
DEFAULT_DB_NAME = "chatfolio"
KNOWLEDGE_COLLECTION = "knowledge"
VECTOR_INDEX_NAME = "knowledge_embedding_index"


def is_configured() -> bool:
    return bool(os.environ.get("MONGODB_URI") and os.environ.get("VOYAGE_API_KEY"))


def _voyage_endpoint(api_key: str) -> str:
    if api_key.startswith("al-"):
        return "https://ai.mongodb.com/v1/embeddings"
    return "https://api.voyageai.com/v1/embeddings"


def embed_text(text: str, input_type: str = "query") -> List[float]:
    api_key = os.environ["VOYAGE_API_KEY"]
    body = {
        "input": [text],
        "model": EMBEDDING_MODEL,
        "output_dimension": EMBEDDING_DIMENSIONS,
        "input_type": input_type,
    }
    request = urllib.request.Request(
        _voyage_endpoint(api_key),
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 5:
                raise
            retry_after = exc.headers.get("Retry-After")
            if retry_after and retry_after.isdigit():
                wait_seconds = int(retry_after)
            else:
                wait_seconds = min(90, 10 * (attempt + 1))
            time.sleep(wait_seconds)
    return payload["data"][0]["embedding"]


@lru_cache(maxsize=1)
def _client():
    from pymongo import MongoClient

    return MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=5000)


def _db():
    return _client()[os.environ.get("MONGODB_DB", DEFAULT_DB_NAME)]


def search_knowledge(query: str, limit: int = 4) -> Tuple[str, List[Dict[str, Any]]]:
    if not is_configured():
        return "", []

    query_embedding = embed_text(query, input_type="query")
    pipeline = [
        {
            "$vectorSearch": {
                "index": VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": max(50, limit * 20),
                "limit": limit,
            }
        },
        {
            "$project": {
                "_id": 0,
                "slug": 1,
                "title": 1,
                "content": 1,
                "type": 1,
                "tags": 1,
                "source_url": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    docs = list(_db()[KNOWLEDGE_COLLECTION].aggregate(pipeline))
    context = "\n\n".join(
        f"{doc.get('title', 'Untitled')}:\n{doc.get('content', '')}" for doc in docs
    )
    sources = [
        {
            "id": doc.get("slug") or doc.get("title", "knowledge"),
            "label": doc.get("title") or doc.get("slug") or "Knowledge",
            "snippet": re.sub(r"\s+", " ", doc.get("content", ""))[:140].rstrip()
            + "...",
            "score": round(float(doc.get("score", 0)), 3),
        }
        for doc in docs
    ]
    return context, sources


def upsert_knowledge_doc(doc: Dict[str, Any]) -> None:
    if not is_configured():
        raise RuntimeError("MONGODB_URI and VOYAGE_API_KEY must be set")

    content = doc["content"].strip()
    collection = _db()[KNOWLEDGE_COLLECTION]
    existing = collection.find_one(
        {
            "slug": doc["slug"],
            "content": content,
            "embedding_model": EMBEDDING_MODEL,
            "embedding_dimensions": EMBEDDING_DIMENSIONS,
        },
        {"_id": 1, "embedding": 1},
    )
    if existing and existing.get("embedding"):
        collection.update_one(
            {"slug": doc["slug"]},
            {"$set": {**doc, "content": content}},
        )
        return

    doc = {
        **doc,
        "content": content,
        "embedding_model": EMBEDDING_MODEL,
        "embedding_dimensions": EMBEDDING_DIMENSIONS,
        "embedding": embed_text(
            f"{doc.get('title', '')}\n{content}", input_type="document"
        ),
    }
    collection.update_one(
        {"slug": doc["slug"]},
        {"$set": doc},
        upsert=True,
    )
