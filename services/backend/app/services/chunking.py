"""
Chunking utilities for the RAG ingestion pipeline.

Splits long-form text (a parsed resume) into overlapping passages small
enough to embed individually. Structured knowledge-base rows (one work
experience entry, one project, one degree) are NOT run through this —
they're already short and self-contained, so splitting them further
would only lose context for no benefit. See ingestion.py.
"""

import re

DEFAULT_CHUNK_SIZE = 800   # characters, not tokens — plenty for resume-length text
DEFAULT_OVERLAP = 150


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_OVERLAP,
) -> list[str]:
    """
    Split `text` into overlapping chunks, breaking on paragraph
    boundaries where possible so a chunk doesn't cut a sentence in half.
    """
    text = text.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    paragraphs = re.split(r"\n\s*\n", text)
    chunks: list[str] = []
    buffer = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(buffer) + len(para) + 2 <= chunk_size:
            buffer = f"{buffer}\n\n{para}".strip()
            continue

        if buffer:
            chunks.append(buffer)
            buffer = ""

        if len(para) <= chunk_size:
            buffer = para
        else:
            # A single paragraph longer than chunk_size — hard-split with overlap.
            step = chunk_size - overlap
            for i in range(0, len(para), step):
                chunks.append(para[i:i + chunk_size])

    if buffer:
        chunks.append(buffer)

    return chunks
