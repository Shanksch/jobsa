"""
Vector retrieval for the autofill RAG pipeline.

Embeds a query (usually a form field's label) and calls the
`match_resume_chunks` Postgres function (see jobsa_schema.sql) to get
the top-k most relevant chunks for that profile via pgvector cosine
distance.
"""

from typing import Any, cast
from app.core.auth import supabase as _supabase
from app.services.embeddings import embed_text, embed_texts
from langfuse import observe

supabase = cast(Any, _supabase)

def _search(profile_id: str, query_embedding: list[float], top_k: int) -> list[dict]:
    res = supabase.rpc(
        "match_resume_chunks",
        {
            "query_embedding": query_embedding,
            "match_profile_id": profile_id,
            "match_count": top_k,
        },
    ).execute()
    return res.data or []


@observe(name="retrieve-relevant-chunks")
async def retrieve_relevant_chunks(
    profile_id: str,
    query: str,
    top_k: int = 6,
) -> list[dict]:
    """
    Returns up to `top_k` chunks, each shaped like:
    {id, source, source_id, chunk_text, similarity}
    """
    query_embedding = await embed_text(query, task_type="RETRIEVAL_QUERY")
    return _search(profile_id, query_embedding, top_k)


@observe(name="retrieve-chunks")
async def retrieve_for_form(
    profile_id: str,
    field_labels: list[str],
    resume_id: str | None = None,
    per_field_k: int = 4,
) -> list[dict]:
    """
    Retrieve chunks for every field on a form and merge them into one
    deduped list, keeping the best similarity score seen for each chunk.
    This keeps generation to a single LLM call fed by context that's
    actually relevant to *this* form, instead of the entire knowledge base.

    Field labels are embedded in one batched Groq call rather than one
    call per field — the RPC search itself still runs once per field
    (it's a fast local Postgres query, not a network round trip to Groq).
    """
    if not field_labels:
        return []

    embeddings = await embed_texts(field_labels, task_type="RETRIEVAL_QUERY")

    # Over-fetch if filtering by resume to ensure we still get enough relevant chunks
    fetch_k = per_field_k * 5 if resume_id else per_field_k

    seen: dict[str, dict] = {}
    for embedding in embeddings:
        for chunk in _search(profile_id, embedding, fetch_k):
            # Filter by resume_id if provided
            if resume_id and chunk.get("source_id") != resume_id and chunk.get("resume_id") != resume_id:
                continue

            existing = seen.get(chunk["id"])
            if not existing or chunk["similarity"] > existing["similarity"]:
                seen[chunk["id"]] = chunk

    # Sort by highest similarity first
    sorted_chunks = sorted(seen.values(), key=lambda c: c["similarity"], reverse=True)

    # Deduplicate overlapping text (e.g. raw resume chunk vs structured chunk)
    final_chunks = []
    for chunk in sorted_chunks:
        words1 = set(chunk["chunk_text"].lower().split())
        is_duplicate = False

        for final_chunk in final_chunks:
            words2 = set(final_chunk["chunk_text"].lower().split())
            if not words1 or not words2:
                continue

            intersection = len(words1 & words2)
            min_len = min(len(words1), len(words2))

            # If 70% of the smaller chunk's words are in the larger chunk, it's a duplicate
            if min_len > 0 and (intersection / min_len) > 0.7:
                is_duplicate = True
                break

        if not is_duplicate:
            final_chunks.append(chunk)

    return final_chunks[:20]
