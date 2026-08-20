"""
Ingestion pipeline: turns a profile's resume + knowledge-base rows into
embedded chunks in `resume_chunks`, so the autofill engine can retrieve
only what's relevant per form field instead of stuffing everything into
every prompt.

Call `reindex_profile(profile_id)` after:
  - a resume finishes parsing (see routes/resumes.py — right after
    `_do_import_resume_sections(...)` in both `upload_resume` and
    `import_resume_to_knowledge_base`)
  - any manual knowledge-base edit you want reflected immediately

This does a full wipe-and-rebuild per profile on every call. That's
fine at the scale of "one person's career history" — a few dozen
chunks, a handful of embedding calls. Revisit only if it becomes
noticeably slow.
"""

from typing import Any, cast
from app.core.auth import supabase as _supabase, get_asupabase
from app.services.chunking import chunk_text_semantic
from app.services.embeddings import embed_texts

supabase = cast(Any, _supabase)

async def index_resume(profile_id: str, resume_id: str) -> int:
    """
    Rebuild chunks for a specific resume. Returns the number of chunks written.
    """
    asupabase = await get_asupabase()
    if not asupabase:
        raise ValueError("Supabase async client is not configured. Check your environment variables.")

    sources: list[tuple[str, str | None, str]] = []  # (source, source_id, text)

    resume_res = (
        supabase.table("resumes")
        .select("id, parsed_text")
        .eq("id", resume_id)
        .eq("profile_id", profile_id)
        .execute()
    )
    if resume_res.data and isinstance(resume_res.data[0], dict) and resume_res.data[0].get("parsed_text"):
        resume = resume_res.data[0]
        chunks = await chunk_text_semantic(str(resume["parsed_text"]))
        for piece in chunks:
            sources.append(("resume", resume["id"], piece))

    # Wipe existing chunks for this specific resume to keep re-runs idempotent
    await asupabase.table("resume_chunks").delete().eq("resume_id", resume_id).execute()

    if not sources:
        return 0

    texts = [s[2] for s in sources]
    embeddings = await embed_texts(texts)

    rows = [
        {
            "profile_id": profile_id,
            "resume_id": source_id if source == "resume" else None,
            "source": source,
            "source_id": source_id,
            "chunk_text": text,
            "embedding": embedding,
            "task_type": "RETRIEVAL_DOCUMENT",
            "chunk_index": i,
        }
        for i, ((source, source_id, text), embedding) in enumerate(zip(sources, embeddings))
    ]

    if not rows:
        return 0

    await asupabase.table("resume_chunks").insert(rows).execute()
    return len(rows)
