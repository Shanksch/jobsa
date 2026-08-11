"""
Chunking utilities for the RAG ingestion pipeline.

Splits long-form text (a parsed resume) into overlapping passages small
enough to embed individually. Structured knowledge-base rows (one work
experience entry, one project, one degree) are NOT run through this —
they're already short and self-contained, so splitting them further
would only lose context for no benefit. See ingestion.py.
"""

import re
import structlog
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential
from google import genai
from google.genai import types

from app.config import settings

logger = structlog.get_logger()
client = genai.Client()

DEFAULT_CHUNK_SIZE = 800  # characters, not tokens — plenty for resume-length text
DEFAULT_OVERLAP = 150

class SemanticChunk(BaseModel):
    chunk_text: str = Field(description="The exact, verbatim text of this chunk, copied character-for-character from the original resume text — not paraphrased, summarized, or retyped.")
    chunk_type: str = Field(description="A brief description of what this chunk contains, e.g., 'Work Experience', 'Summary', 'Education'.")

class SemanticChunkList(BaseModel):
    chunks: list[SemanticChunk]


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
            # A single paragraph longer than chunk_size — hard-split with overlap,
            # but on word boundaries so we never cut a word in half (e.g. slicing
            # "Shanksch" into "Shan" + "ksch" at an arbitrary character offset).
            words = para.split(" ")
            piece = ""
            pieces: list[str] = []
            for word in words:
                candidate = f"{piece} {word}".strip() if piece else word
                if len(candidate) > chunk_size and piece:
                    pieces.append(piece)
                    piece = word
                else:
                    piece = candidate
            if piece:
                pieces.append(piece)

            # Apply overlap between consecutive word-bounded pieces by carrying
            # the tail words of one piece into the start of the next.
            for idx, p in enumerate(pieces):
                if idx == 0:
                    chunks.append(p)
                    continue
                prev_words = pieces[idx - 1].split(" ")
                tail = ""
                for w in reversed(prev_words):
                    candidate = f"{w} {tail}".strip() if tail else w
                    if len(candidate) > overlap:
                        break
                    tail = candidate
                chunks.append(f"{tail} {p}".strip() if tail else p)

    if buffer:
        chunks.append(buffer)

    return chunks

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=5),
    reraise=True
)
async def _do_chunk_text_semantic(text: str) -> list[str]:
    prompt = (
        "You are an expert at analyzing resumes. Please divide the following resume text into logically distinct semantic chunks "
        "(e.g., individual jobs, distinct educational degrees, summary paragraph, specific skill sections). "
        "For each chunk, copy the EXACT VERBATIM text from the resume — character-for-character, including original "
        "punctuation, casing, and whitespace. Do not paraphrase, summarize, retype, or 'correct' anything; treat it as a "
        "copy-paste operation, not a rewrite. The chunks should ideally be self-contained and meaningful, "
        "around 200-800 characters each if possible, but prioritize logical boundaries over strict length constraints.\n\n"
        f"Resume text:\n{text}"
    )

    response = await client.aio.models.generate_content(
        model=settings.chunking_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SemanticChunkList,
            temperature=0.0,
        )
    )

    if not response.text:
        raise ValueError("Empty response from semantic chunker.")
        
    chunk_list = SemanticChunkList.model_validate_json(response.text)

    extracted_chunks = []
    for chunk in chunk_list.chunks:
        extracted_chunk = (chunk.chunk_text or "").strip()

        if not extracted_chunk:
            logger.warning("empty_semantic_chunk", chunk_type=chunk.chunk_type)
            continue

        # Sub-chunking for anything absurdly long (model over-included text).
        # chunk_text() now splits on word boundaries, so this can't introduce
        # mid-word cuts even in the fallback path.
        if len(extracted_chunk) > 4000:  # ~1000 tokens, well under the 2048 limit but still large
            sub_chunks = chunk_text(extracted_chunk)
            extracted_chunks.extend(sub_chunks)
        else:
            extracted_chunks.append(extracted_chunk)

    if not extracted_chunks:
        raise ValueError("Semantic chunking returned zero valid chunks.")

    return extracted_chunks

async def chunk_text_semantic(text: str) -> list[str]:
    """
    Attempt to use Gemini to intelligently chunk a resume based on semantic boundaries.
    Falls back to the naive character-based chunker if the LLM fails, times out, or returns invalid offsets.
    """
    text = text.strip()
    if not text:
        return []
        
    try:
        return await _do_chunk_text_semantic(text)
    except Exception as e:
        logger.warning("semantic_chunking_failed_fallback_to_naive", error=str(e))
        return chunk_text(text)